var BitwigHW = require('./Bitwig');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeTrack(opts) {
    opts = opts || {};
    var _name = opts.name || '';
    var _isGroup = opts.isGroup || false;
    var _exists = opts.exists !== undefined ? opts.exists : true;
    var _volume = opts.volume || 0;
    var _color = opts.color || { r: 0, g: 0, b: 0 };
    var _selected = false;
    return {
        name: function() { return { get: function() { return _name; } }; },
        isGroup: function() { return { get: function() { return _isGroup; } }; },
        exists: function() { return { get: function() { return _exists; } }; },
        volume: function() {
            return {
                get: function() { return _volume; },
                set: function(v) { _volume = v; }
            };
        },
        color: function() {
            return {
                red: function() { return _color.r; },
                green: function() { return _color.g; },
                blue: function() { return _color.b; }
            };
        },
        selectInMixer: function() { _selected = true; },
        _isSelected: function() { return _selected; }
    };
}

function fakeTrackBank(tracks) {
    return {
        getItemAt: function(id) {
            return tracks[id] || fakeTrack({ exists: false });
        }
    };
}

function fakeTransport() {
    var _position = 0;
    var _loopStart = 0;
    var _loopDuration = 0;
    var _recordEnabled = false;
    return {
        playPosition: function() {
            return {
                get: function() { return _position; },
                markInterested: function() {}
            };
        },
        tempo: function() {
            return { markInterested: function() {} };
        },
        playStartPosition: function() {
            return { markInterested: function() {} };
        },
        arrangerLoopStart: function() {
            return {
                get: function() { return _loopStart; },
                set: function(v) { _loopStart = v; },
                markInterested: function() {}
            };
        },
        arrangerLoopDuration: function() {
            return {
                get: function() { return _loopDuration; },
                set: function(v) { _loopDuration = v; },
                markInterested: function() {}
            };
        },
        setPosition: function(beats) { _position = beats; },
        isArrangerRecordEnabled: function() {
            return {
                set: function(v) { _recordEnabled = v; }
            };
        },
        _getPosition: function() { return _position; },
        _getLoopStart: function() { return _loopStart; },
        _getLoopDuration: function() { return _loopDuration; }
    };
}

function fakeHost() {
    var _arrangerCalls = 0;
    var _appCalls = 0;
    return {
        createArranger: function() {
            _arrangerCalls++;
            return {
                createCueMarkerBank: function(size) {
                    return { _size: size };
                }
            };
        },
        createApplication: function() {
            _appCalls++;
            return {
                getAction: function(id) {
                    return {
                        _id: id,
                        invoke: function() {}
                    };
                }
            };
        },
        _arrangerCalls: function() { return _arrangerCalls; },
        _appCalls: function() { return _appCalls; }
    };
}

function fakeBitwigActions() {
    return { UNSELECT_ALL: "Unselect All" };
}

function makeBitwig(opts) {
    opts = opts || {};
    return new BitwigHW({
        host: opts.host || fakeHost(),
        bitwigActions: opts.bitwigActions || fakeBitwigActions(),
        debug: opts.debug || false,
        println: opts.println || function() {}
    });
}

// ---- tests ----

// getTrack returns track for valid ID
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Bass', exists: true });
    tracks[5] = fakeTrack({ name: 'Drums', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());

    assert(bw.getTrack(0) !== null, 'getTrack(0) returns existing track');
    assert(bw.getTrack(0).name().get() === 'Bass', 'getTrack(0) is Bass');
    assert(bw.getTrack(5) !== null, 'getTrack(5) returns existing track');
})();

// getTrack returns null for invalid IDs
(function() {
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), fakeTransport());

    assert(bw.getTrack(-1) === null, 'getTrack(-1) returns null');
    assert(bw.getTrack(64) === null, 'getTrack(64) returns null');
    assert(bw.getTrack(null) === null, 'getTrack(null) returns null');
    assert(bw.getTrack(undefined) === null, 'getTrack(undefined) returns null');
})();

// getTrack returns null for non-existing track
(function() {
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), fakeTransport());

    assert(bw.getTrack(10) === null, 'getTrack for non-existing track returns null');
})();

// getTrackTree builds hierarchy from depths
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Top Group', isGroup: true, exists: true });
    tracks[1] = fakeTrack({ name: 'Child Track', exists: true });
    tracks[2] = fakeTrack({ name: 'Another Top', isGroup: true, exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());
    bw.setTrackDepths([0, 1, 0]);

    var tree = bw.getTrackTree();
    assert(tree.length === 2, 'two top-level tracks');
    assert(tree[0].name === 'Top Group', 'first top-level is Top Group');
    assert(tree[0].children.length === 1, 'Top Group has one child');
    assert(tree[0].children[0].name === 'Child Track', 'child is Child Track');
    assert(tree[1].name === 'Another Top', 'second top-level is Another Top');
})();

// getTrackTree caches result, clearCache invalidates
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Track A', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());
    bw.setTrackDepths([0]);

    var tree1 = bw.getTrackTree();
    var tree2 = bw.getTrackTree();
    assert(tree1 === tree2, 'getTrackTree returns cached result');

    bw.clearCache();
    var tree3 = bw.getTrackTree();
    assert(tree1 !== tree3, 'clearCache invalidates the tree cache');
})();

// getTrackChildren returns children of a group
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Group', isGroup: true, exists: true });
    tracks[1] = fakeTrack({ name: 'Child A', exists: true });
    tracks[2] = fakeTrack({ name: 'Child B', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());
    bw.setTrackDepths([0, 1, 1]);

    var children = bw.getTrackChildren(0);
    assert(children.length === 2, 'group has 2 children');
    assert(children[0].name === 'Child A', 'first child is Child A');
    assert(children[1].name === 'Child B', 'second child is Child B');
})();

// getTrackChildren returns empty array for non-group
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Solo', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());
    bw.setTrackDepths([0]);

    var children = bw.getTrackChildren(0);
    assert(children.length === 0, 'non-group track has no children');
})();

// getGroupChildren returns child IDs
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Group', isGroup: true, exists: true });
    tracks[1] = fakeTrack({ name: 'Child', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());
    bw.setTrackDepths([0, 1]);

    var ids = bw.getGroupChildren(0);
    assert(ids.length === 1, 'one child ID');
    assert(ids[0] === 1, 'child ID is 1');
})();

// getTopLevelTracks returns only depth-0 tracks
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Top A', exists: true });
    tracks[1] = fakeTrack({ name: 'Nested', exists: true });
    tracks[2] = fakeTrack({ name: 'Top B', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());
    bw.setTrackDepths([0, 1, 0]);

    var topLevel = bw.getTopLevelTracks();
    assert(topLevel.length === 2, 'two top-level tracks');
    assert(topLevel[0] === 0, 'first top-level is index 0');
    assert(topLevel[1] === 2, 'second top-level is index 2');
})();

// findGroupByNumber finds group with (N) in name
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Drums (1)', isGroup: true, exists: true });
    tracks[1] = fakeTrack({ name: 'Bass (2)', isGroup: true, exists: true });
    tracks[2] = fakeTrack({ name: 'Not a group (3)', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());

    assert(bw.findGroupByNumber(1) === 0, 'finds group (1)');
    assert(bw.findGroupByNumber(2) === 1, 'finds group (2)');
    assert(bw.findGroupByNumber(3) === null, 'non-group with (3) returns null');
    assert(bw.findGroupByNumber(99) === null, 'non-existent group returns null');
})();

// getTrackColor returns color components
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Red Track', exists: true, color: { r: 1, g: 0.5, b: 0 } });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());

    var color = bw.getTrackColor(0);
    assert(color !== null, 'getTrackColor returns color');
    assert(color.red === 1, 'red component is 1');
    assert(color.green === 0.5, 'green component is 0.5');
    assert(color.blue === 0, 'blue component is 0');
})();

// getTrackColor returns null for invalid track
(function() {
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), fakeTransport());

    assert(bw.getTrackColor(99) === null, 'getTrackColor returns null for invalid ID');
})();

// getTrackVolume and setTrackVolume
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Bass', exists: true, volume: 0.75 });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());

    assert(bw.getTrackVolume(0) === 0.75, 'getTrackVolume returns 0.75');
    bw.setTrackVolume(0, 0.5);
    assert(bw.getTrackVolume(0) === 0.5, 'setTrackVolume updates to 0.5');
})();

// getTrackVolume returns -1 for invalid track
(function() {
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), fakeTransport());

    assert(bw.getTrackVolume(99) === -1, 'getTrackVolume returns -1 for invalid track');
})();

// setTimeSelection sets loop start and duration
(function() {
    var transport = fakeTransport();
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), transport);

    bw.setTimeSelection(4, 12);
    assert(transport._getLoopStart() === 4, 'loop start set to 4');
    assert(transport._getLoopDuration() === 8, 'loop duration set to 8 (12 - 4)');
})();

// movePlayheadByBars moves forward and backward
(function() {
    var transport = fakeTransport();
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), transport);

    // Move forward 2 bars from position 0
    bw.movePlayheadByBars(2);
    assert(transport._getPosition() === 8, 'moved forward 2 bars (8 beats)');

    // Move backward 1 bar
    bw.movePlayheadByBars(-1);
    assert(transport._getPosition() === 4, 'moved backward 1 bar (4 beats)');
})();

// movePlayheadByBars clamps at 0
(function() {
    var transport = fakeTransport();
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), transport);

    bw.movePlayheadByBars(-10);
    assert(transport._getPosition() === 0, 'playhead clamped at 0');
})();

// setPlayheadPosition sets transport position
(function() {
    var transport = fakeTransport();
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), transport);

    bw.setPlayheadPosition(16);
    assert(transport._getPosition() === 16, 'playhead set to 16 beats');
})();

// clearTimeSelection calls invokeAction with UNSELECT_ALL
(function() {
    var invokedActions = [];
    var host = fakeHost();
    // Override createApplication to track invocations
    host.createApplication = function() {
        return {
            getAction: function(id) {
                return {
                    invoke: function() { invokedActions.push(id); }
                };
            }
        };
    };

    var bw = makeBitwig({ host: host });
    bw.init(fakeTrackBank({}), fakeTransport());
    bw.clearTimeSelection();

    assert(invokedActions.length === 1, 'one action invoked');
    assert(invokedActions[0] === 'Unselect All', 'UNSELECT_ALL action invoked');
})();

// init creates arranger and marker bank via host
(function() {
    var host = fakeHost();
    var bw = makeBitwig({ host: host });
    bw.init(fakeTrackBank({}), fakeTransport());

    assert(host._arrangerCalls() === 1, 'createArranger called once');
    assert(host._appCalls() === 1, 'createApplication called once');
    assert(bw.getMarkerBank() !== null, 'marker bank created');
    assert(bw.getMarkerBank()._size === 32, 'marker bank has 32 slots');
})();

// init accepts effectTrackBank as 3rd param
(function() {
    var bw = makeBitwig();
    var etb = { _fake: true };
    bw.init(fakeTrackBank({}), fakeTransport(), etb);

    assert(bw._effectTrackBank === etb, 'effect track bank stored');
})();

// _updateFxTrackCache adds tracks with [N] pattern
(function() {
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), fakeTransport());

    var fxTrack1 = { _name: 'Reverb [2]' };
    var fxTrack2 = { _name: 'Delay [1]' };

    bw._updateFxTrackCache(0, 'Reverb [2]', fxTrack1);
    bw._updateFxTrackCache(1, 'Delay [1]', fxTrack2);

    var fx = bw.getFxTracks();
    assert(fx.length === 2, 'two FX tracks cached');
    assert(fx[0].number === 1, 'sorted: first is [1]');
    assert(fx[1].number === 2, 'sorted: second is [2]');
})();

// _updateFxTrackCache removes tracks without [N] pattern
(function() {
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), fakeTransport());

    bw._updateFxTrackCache(0, 'Reverb [1]', {});
    assert(bw.getFxTracks().length === 1, 'one FX track');

    // Rename without pattern
    bw._updateFxTrackCache(0, 'Reverb', {});
    assert(bw.getFxTracks().length === 0, 'FX track removed when pattern gone');
})();

// _updateFxTrackCache ignores [N] outside 1-8
(function() {
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), fakeTransport());

    bw._updateFxTrackCache(0, 'Track [0]', {});
    assert(bw.getFxTracks().length === 0, '[0] ignored');

    bw._updateFxTrackCache(0, 'Track [9]', {});
    assert(bw.getFxTracks().length === 0, '[9] ignored');
})();

// initCursor stores cursor refs, getters return them
(function() {
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), fakeTransport());

    var ct = { _type: 'cursorTrack' };
    var cd = { _type: 'cursorDevice' };
    var rc = { _type: 'remoteControls' };

    bw.initCursor(ct, cd, rc);
    assert(bw.getCursorTrack() === ct, 'getCursorTrack returns stored ref');
    assert(bw.getCursorDevice() === cd, 'getCursorDevice returns stored ref');
    assert(bw.getRemoteControls() === rc, 'getRemoteControls returns stored ref');
})();

// findTrackByName finds track matching predicate
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Bass', exists: true });
    tracks[1] = fakeTrack({ name: 'Drums', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());

    var found = bw.findTrackByName(function(n) { return n === 'Drums'; });
    assert(found !== null, 'findTrackByName returns matching track');
    assert(found.name().get() === 'Drums', 'found track is Drums');

    var notFound = bw.findTrackByName(function(n) { return n === 'Guitar'; });
    assert(notFound === null, 'findTrackByName returns null for no match');
})();

// selectTrack calls selectInMixer on the track
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'Bass', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());

    bw.selectTrack(0);
    assert(tracks[0]._isSelected(), 'selectTrack calls selectInMixer');
})();

// invokeAction invokes action through application
(function() {
    var invoked = [];
    var host = fakeHost();
    host.createApplication = function() {
        return {
            getAction: function(id) {
                return {
                    invoke: function() { invoked.push(id); }
                };
            }
        };
    };

    var bw = makeBitwig({ host: host });
    bw.init(fakeTrackBank({}), fakeTransport());

    bw.invokeAction('test_action');
    assert(invoked.length === 1, 'action invoked');
    assert(invoked[0] === 'test_action', 'correct action ID');
})();

// invokeAction handles missing application gracefully
(function() {
    var logged = [];
    var bw = makeBitwig({ println: function(msg) { logged.push(msg); } });
    // Don't call init, so _application is null

    bw.invokeAction('test');
    var hasError = logged.some(function(m) { return m.indexOf('ERROR') !== -1; });
    assert(hasError, 'logs error when application not initialized');
})();

// invokeAction handles action not found
(function() {
    var logged = [];
    var host = fakeHost();
    host.createApplication = function() {
        return {
            getAction: function() { return null; }
        };
    };

    var bw = makeBitwig({ host: host, println: function(msg) { logged.push(msg); } });
    bw.init(fakeTrackBank({}), fakeTransport());

    bw.invokeAction('nonexistent');
    var hasError = logged.some(function(m) { return m.indexOf('Action not found') !== -1; });
    assert(hasError, 'logs error when action not found');
})();

// getTransport returns the stored transport
(function() {
    var transport = fakeTransport();
    var bw = makeBitwig();
    bw.init(fakeTrackBank({}), transport);

    assert(bw.getTransport() === transport, 'getTransport returns transport');
})();

// setTrackDepths clears tree cache
(function() {
    var tracks = {};
    tracks[0] = fakeTrack({ name: 'A', exists: true });

    var bw = makeBitwig();
    bw.init(fakeTrackBank(tracks), fakeTransport());
    bw.setTrackDepths([0]);

    var tree1 = bw.getTrackTree();
    bw.setTrackDepths([0]);
    var tree2 = bw.getTrackTree();
    assert(tree1 !== tree2, 'setTrackDepths clears cached tree');
})();

process.exit(t.summary('Bitwig'));
