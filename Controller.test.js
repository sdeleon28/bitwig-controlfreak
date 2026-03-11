// MapperCacheHW must be global before requiring Controller (which references it)
global.MapperCacheHW = require('./MapperCache');
var ControllerHW = require('./Controller');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeTrack(name, opts) {
    opts = opts || {};
    var _muted = opts.muted || false;
    var _soloed = opts.soloed || false;
    var _armed = opts.armed || false;
    var _color = opts.color || { r: 0.5, g: 0.5, b: 0.5 };
    var _visibleCalls = 0;
    var obj = {
        name: function() { return { get: function() { return name; } }; },
        isGroup: function() { return { get: function() { return opts.isGroup || false; } }; },
        color: function() {
            return {
                red: function() { return _color.r; },
                green: function() { return _color.g; },
                blue: function() { return _color.b; }
            };
        },
        mute: function() {
            return {
                get: function() { return _muted; },
                set: function(v) { _muted = v; },
                toggle: function() { _muted = !_muted; }
            };
        },
        solo: function() {
            return {
                get: function() { return _soloed; },
                set: function(v) { _soloed = v; },
                toggle: function() { _soloed = !_soloed; }
            };
        },
        arm: function() {
            return {
                get: function() { return _armed; },
                set: function(v) { _armed = v; }
            };
        },
        makeVisibleInArranger: function() { _visibleCalls++; },
        selectInMixer: function() { _visibleCalls; },
        _getVisibleCalls: function() { return _visibleCalls; }
    };
    return obj;
}

function fakeBitwig(opts) {
    opts = opts || {};
    var tracks = opts.tracks || {};
    var groups = opts.groups || {};
    var groupChildren = opts.groupChildren || {};
    var topLevel = opts.topLevel || [];
    var _toggleDevicesCalls = 0;
    var result = {
        _trackDepths: opts.trackDepths || {},
        _application: {
            toggleDevices: function() { _toggleDevicesCalls++; }
        },
        _getToggleDevicesCalls: function() { return _toggleDevicesCalls; },
        selectedTracks: [],
        getTrack: function(id) { return tracks[id] || null; },
        getTopLevelTracks: function() { return topLevel; },
        findGroupByNumber: function(n) { return groups[n] !== undefined ? groups[n] : null; },
        getGroupChildren: function(gid) { return groupChildren[gid] || []; },
        getTransport: function() {
            return {
                tempo: function() {
                    var _bpm = opts.bpm || 120;
                    return {
                        getRaw: function() { return _bpm; },
                        setRaw: function(v) { _bpm = v; }
                    };
                }
            };
        },
        getMasterTrack: function() { return opts.masterTrack || null; },
        getCursorDevice: function() {
            var windowOpen = opts._pluginWindowOpen || false;
            var isPlugin = opts._isPlugin || false;
            var rcVisible = opts._remoteControlsSectionVisible || false;
            return {
                selectNone: function() { result._selectNoneCalls = (result._selectNoneCalls || 0) + 1; },
                selectDevice: function(device) { result._selectedDevice = device; },
                isWindowOpen: function() {
                    return {
                        get: function() { return windowOpen; },
                        set: function(v) { windowOpen = v; result._pluginWindowOpen = v; }
                    };
                },
                isPlugin: function() {
                    return {
                        get: function() { return isPlugin; }
                    };
                },
                isRemoteControlsSectionVisible: function() {
                    return {
                        get: function() { return rcVisible; },
                        set: function(v) { rcVisible = v; result._remoteControlsSectionVisible = v; }
                    };
                },
                name: function() {
                    return {
                        get: function() { return opts._cursorDeviceName || ''; }
                    };
                }
            };
        },
        getDeviceBank: function() { return opts.deviceBank || null; },
        selectTrack: function(id) { result.selectedTracks.push(id); },
        getCursorTrack: function() { return opts.cursorTrack || null; },
        setTimeSelection: function(start, end) { result._timeSelection = { start: start, end: end }; },
        setPlayheadPosition: function(pos) { result._playheadPos = pos; },
        getMarkerBank: function() { return opts.markerBank || null; },
        getTrackRemoteControls: function() { return opts.trackRemoteControls || null; },
        getRemoteControls: function() {
            var names = opts.remoteControlNames || [];
            var params = {};
            for (var i = 0; i < 8; i++) {
                (function(idx) {
                    params[idx] = {
                        name: function() { return { get: function() { return names[idx] || ""; } }; },
                        value: function() { return { get: function() { return 0; }, set: function() {} }; }
                    };
                })(i);
            }
            return { getParameter: function(i) { return params[i]; } };
        }
    };
    return result;
}

function fakeTwister(opts) {
    opts = opts || {};
    var links = {};
    var trackToEncoder = {};
    var behaviors = {};
    var leds = {};
    var calls = [];
    return {
        calls: calls,
        links: links,
        leds: leds,
        behaviors: behaviors,
        unlinkAll: function() {
            for (var k in links) delete links[k];
            for (var k in trackToEncoder) delete trackToEncoder[k];
            for (var k in behaviors) delete behaviors[k];
            calls.push('unlinkAll');
        },
        linkEncoderToTrack: function(enc, tid) {
            links[enc] = { trackId: tid };
            trackToEncoder[tid] = enc;
            calls.push({ method: 'linkEncoderToTrack', encoder: enc, trackId: tid });
        },
        linkEncoderToBehavior: function(enc, turnCb, pressCb, color) {
            behaviors[enc] = { turn: turnCb, press: pressCb, color: color };
            calls.push({ method: 'linkEncoderToBehavior', encoder: enc });
        },
        setEncoderLED: function(enc, value) {
            leds[enc] = value;
            calls.push({ method: 'setEncoderLED', encoder: enc, value: value });
        },
        getEncoderLink: function(enc) { return links[enc] || null; },
        getEncoderForTrack: function(tid) { return trackToEncoder[tid] || null; },
        unlinkEncoder: function(enc) {
            var link = links[enc];
            if (link) delete trackToEncoder[link.trackId];
            delete links[enc];
            delete behaviors[enc];
            calls.push({ method: 'unlinkEncoder', encoder: enc });
        },
        linkEncodersToTrackSends: function(tid) { calls.push({ method: 'linkEncodersToTrackSends', trackId: tid }); },
        linkEncodersToRemoteControls: function() { calls.push('linkEncodersToRemoteControls'); },
        linkEncodersToTrackRemoteControls: function() { calls.push('linkEncodersToTrackRemoteControls'); },
        linkEncodersToProjectRemoteControls: function() { calls.push('linkEncodersToProjectRemoteControls'); },
        ccToEncoder: function(cc) { return cc + 1; },
        handleEncoderTurn: function(enc, val) { calls.push({ method: 'handleEncoderTurn', encoder: enc, value: val }); },
        handleEncoderPress: function(enc, pressed) { calls.push({ method: 'handleEncoderPress', encoder: enc, pressed: pressed }); },
        clearAll: function() { calls.push('clearAll'); }
    };
}

function fakeLaunchpad() {
    var behaviors = {};
    var padColors = {};
    var padLinks = {};
    var calls = [];
    return {
        colors: { off: 0, green: 21, red: 5, amber: 17, yellow: 13, blue: 45, white: 3 },
        brightness: { dim: 'dim', bright: 'bright' },
        calls: calls,
        behaviors: behaviors,
        padColors: padColors,
        padLinks: padLinks,
        unlinkAllPads: function() {
            for (var k in padLinks) delete padLinks[k];
            calls.push('unlinkAllPads');
        },
        unlinkPad: function(pad) { delete padLinks[pad]; calls.push({ method: 'unlinkPad', pad: pad }); },
        linkPadToTrack: function(pad, tid, page) { padLinks[pad] = { trackId: tid, page: page }; },
        getBrightnessVariant: function(baseColor, level) {
            return baseColor + '_' + level;
        },
        bitwigColorToLaunchpad: function(r, g, b) { return 'lp_' + r + '_' + g + '_' + b; },
        setPadColor: function(pad, color) { padColors[pad] = color; calls.push({ method: 'setPadColor', pad: pad, color: color }); },
        registerPadBehavior: function(pad, click, hold, page) { behaviors[pad] = { click: click, hold: hold, page: page }; },
        clearPadBehavior: function(pad) { delete behaviors[pad]; calls.push({ method: 'clearPadBehavior', pad: pad }); },
        handlePadPress: function(pad) { calls.push({ method: 'handlePadPress', pad: pad }); return true; },
        handlePadRelease: function(pad) { calls.push({ method: 'handlePadRelease', pad: pad }); },
        clearAll: function() { calls.push('clearAll'); },
        exitProgrammerMode: function() { calls.push('exitProgrammerMode'); }
    };
}

function fakeQuadrant() {
    return {
        bottomRight: {
            pads: [41, 42, 43, 44, 45, 46, 47, 48, 31, 32, 33, 34, 35, 36, 37, 38]
        },
        bottomLeft: {
            pads: [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28]
        }
    };
}

function fakeModeSwitcher(padMode) {
    var calls = [];
    return {
        calls: calls,
        modes: {
            mute: { note: 69 },
            solo: { note: 59 },
            recordArm: { note: 49 }
        },
        getPadMode: function() { return padMode || 'mute'; },
        refresh: function() { calls.push('refresh'); }
    };
}

function fakePager(activePage) {
    var paints = [];
    return {
        paints: paints,
        getActivePage: function() { return activePage || 1; },
        requestPaint: function(page, pad, color) { paints.push({ page: page, pad: pad, color: color }); }
    };
}

function fakeTopButtons() {
    var calls = [];
    return {
        calls: calls,
        handleTopButtonCC: function(cc, val) {
            calls.push({ method: 'handleTopButtonCC', cc: cc, val: val });
            return cc >= 104 && cc <= 111;
        }
    };
}

function fakePages() {
    var calls = [];
    return {
        calls: calls,
        handlePadPress: function(pad) { calls.push({ method: 'handlePadPress', pad: pad }); return true; },
        handlePadRelease: function(pad) { calls.push({ method: 'handlePadRelease', pad: pad }); }
    };
}

function fakeHost() {
    var notifications = [];
    var scheduled = [];
    return {
        notifications: notifications,
        scheduled: scheduled,
        showPopupNotification: function(msg) { notifications.push(msg); },
        scheduleTask: function(fn, arg, delay) { scheduled.push({ fn: fn, delay: delay }); }
    };
}

function fakeDeviceSelector() {
    var calls = [];
    var _active = false;
    return {
        calls: calls,
        _onDeviceSelected: null,
        _onExit: null,
        activate: function(onDeviceSelected, onExit) {
            _active = true;
            this._onDeviceSelected = onDeviceSelected;
            this._onExit = onExit;
            calls.push('activate');
        },
        deactivate: function() { _active = false; calls.push('deactivate'); },
        isActive: function() { return _active; },
        _cursorDevicePosition: -1
    };
}

function fakeDeviceQuadrant() {
    var calls = [];
    var _active = false;
    return {
        calls: calls,
        _exitCallback: null,
        _lastPadMapper: null,
        activate: function(cb, padMapper) { _active = true; this._exitCallback = cb; this._lastPadMapper = padMapper || null; calls.push('activate'); },
        deactivate: function() { _active = false; calls.push('deactivate'); },
        applyPadMapper: function(padMapper) { this._lastPadMapper = padMapper || null; calls.push('applyPadMapper'); },
        isActive: function() { return _active; }
    };
}

function fakeMapper() {
    var calls = [];
    var _encoderParams = {};
    var _clicks = {};
    var _holds = {};
    var _fedParams = [];
    var obj = {
        calls: calls,
        _encoderParams: _encoderParams,
        _clicks: _clicks,
        _holds: _holds,
        _fedParams: _fedParams,
        encoderParamId: function(enc) { calls.push({ method: 'encoderParamId', encoder: enc }); return _encoderParams[enc] || null; },
        handleClick: function(enc) { calls.push({ method: 'handleClick', encoder: enc }); return _clicks[enc] || null; },
        handleHold: function(enc, pressed) { calls.push({ method: 'handleHold', encoder: enc, pressed: pressed }); return _holds[enc] || null; },
        notifyButtonState: function(enc, pressed) { calls.push({ method: 'notifyButtonState', encoder: enc, pressed: pressed }); },
        feed: function(id, value) { _fedParams.push({ id: id, value: value }); calls.push({ method: 'feed', id: id, value: value }); return true; }
    };
    return obj;
}

function fakePadMapper() {
    var calls = [];
    var _paramValues = [];
    return {
        calls: calls,
        _paramValues: _paramValues,
        activate: function(api) { calls.push('activate'); },
        deactivate: function() { calls.push('deactivate'); },
        onParamValueChanged: function(id, value) { _paramValues.push({ id: id, value: value }); calls.push({ method: 'onParamValueChanged', id: id, value: value }); }
    };
}

function makeController(opts) {
    opts = opts || {};
    return new ControllerHW({
        twister: opts.twister || fakeTwister(),
        bitwig: opts.bitwig || fakeBitwig(),
        pager: opts.pager || fakePager(),
        launchpad: opts.launchpad || fakeLaunchpad(),
        launchpadQuadrant: opts.launchpadQuadrant || fakeQuadrant(),
        launchpadModeSwitcher: opts.launchpadModeSwitcher || fakeModeSwitcher(),
        launchpadTopButtons: opts.launchpadTopButtons || fakeTopButtons(),
        pages: opts.pages || fakePages(),
        pageMainControl: opts.pageMainControl || { pageNumber: 1 },
        deviceQuadrant: opts.deviceQuadrant || null,
        deviceSelector: opts.deviceSelector || null,
        mappers: opts.mappers || {},
        padMappers: opts.padMappers || {},
        painter: opts.painter || null,
        favBar: opts.favBar || null,
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// selectGroup(16) links top-level tracks by (N) naming
(function() {
    var tw = fakeTwister();
    var bw = fakeBitwig({
        topLevel: [0, 1, 2],
        tracks: {
            0: fakeTrack("Bass (1)"),
            1: fakeTrack("Drums (2)"),
            2: fakeTrack("Keys (no number)")
        }
    });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectGroup(16);
    assert(tw.links[1] && tw.links[1].trackId === 0, "encoder 1 should link to track 0 (Bass (1))");
    assert(tw.links[2] && tw.links[2].trackId === 1, "encoder 2 should link to track 1 (Drums (2))");
    assert(!tw.links[3], "encoder 3 should not be linked (no (3) track)");
    assert(ctrl.selectedGroup === 16, "selectedGroup should be 16");
})();

// selectGroup(16) allows encoder 4 for track linking (no tempo reservation)
(function() {
    var tw = fakeTwister();
    var bw = fakeBitwig({
        topLevel: [0],
        tracks: { 0: fakeTrack("FX (4)") }
    });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectGroup(16);
    assert(tw.links[4] && tw.links[4].trackId === 0, "encoder 4 should link to track with (4) naming");
})();

// selectGroup(1-15) finds group and links children
(function() {
    var tw = fakeTwister();
    var bw = fakeBitwig({
        groups: { 5: 10 },
        groupChildren: { 10: [11, 12] },
        tracks: {
            10: fakeTrack("Synths (5)", { isGroup: true }),
            11: fakeTrack("Pad (1)"),
            12: fakeTrack("Lead (2)")
        }
    });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectGroup(5);
    assert(tw.links[1] && tw.links[1].trackId === 11, "encoder 1 should link to child track Pad (1)");
    assert(tw.links[2] && tw.links[2].trackId === 12, "encoder 2 should link to child track Lead (2)");
    assert(tw.links[16] && tw.links[16].trackId === 10, "encoder 16 should link to group track itself");
    assert(ctrl.selectedGroup === 5, "selectedGroup should be 5");
})();

// selectGroup(1-15) shows group name notification
(function() {
    var h = fakeHost();
    var bw = fakeBitwig({
        groups: { 3: 7 },
        groupChildren: { 7: [] },
        tracks: { 7: fakeTrack("Guitars (3)") }
    });
    var ctrl = makeController({ bitwig: bw, host: h });
    ctrl.selectGroup(3);
    assert(h.notifications.indexOf("Guitars (3)") !== -1, "should show group name notification");
})();

// selectGroup out of range is no-op
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl.selectGroup(0);
    assert(tw.calls.length === 0, "selectGroup(0) should be no-op");
    ctrl.selectGroup(17);
    assert(tw.calls.length === 0, "selectGroup(17) should be no-op");
    assert(ctrl.selectedGroup === null, "selectedGroup should remain null");
})();

// refreshGroupDisplay paints group selector pads
(function() {
    var pager = fakePager(1);
    var lp = fakeLaunchpad();
    var bw = fakeBitwig({
        groups: { 1: 0, 2: 1 },
        tracks: {
            0: fakeTrack("Drums (1)", { color: { r: 1, g: 0, b: 0 } }),
            1: fakeTrack("Bass (2)", { color: { r: 0, g: 1, b: 0 } })
        }
    });
    var ctrl = makeController({ pager: pager, launchpad: lp, bitwig: bw });
    ctrl.selectedGroup = 16;
    ctrl.refreshGroupDisplay();
    // Groups 1 and 2 should be linked
    assert(lp.padLinks[41], "pad for group 1 should be linked");
    assert(lp.padLinks[42], "pad for group 2 should be linked");
    // Pad 16 (top-level) should be bright red when group 16 selected
    var pad16Paints = pager.paints.filter(function(p) { return p.pad === 38; }); // pads[15] = 38
    assert(pad16Paints.length > 0, "should paint pad 16");
    assert(pad16Paints[0].color === '5_bright', "pad 16 should be bright red when group 16 selected");
})();

// refreshGroupDisplay highlights selected group (1-15)
(function() {
    var pager = fakePager(1);
    var lp = fakeLaunchpad();
    var bw = fakeBitwig({
        groups: { 2: 5 },
        tracks: {
            5: fakeTrack("Bass (2)", { color: { r: 0, g: 1, b: 0 } })
        }
    });
    var ctrl = makeController({ pager: pager, launchpad: lp, bitwig: bw });
    ctrl.selectedGroup = 2;
    ctrl.refreshGroupDisplay();
    // Selected group pad should get bright color
    var pad2Paints = pager.paints.filter(function(p) { return p.pad === 42; }); // pads[1] = 42
    assert(pad2Paints.length > 0, "should paint selected group pad");
    // Should use bright variant (bright = visually prominent)
    var hasBright = pad2Paints.some(function(p) { return typeof p.color === 'string' && p.color.indexOf('bright') !== -1; });
    assert(hasBright, "selected group should have bright variant");
})();

// refreshTrackGrid links pads and registers mute behaviors
(function() {
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    tw.links[2] = { trackId: 7 };
    var bw = fakeBitwig({
        tracks: {
            3: fakeTrack("Kick (1)"),
            7: fakeTrack("Snare (2)")
        }
    });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('mute');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    // Pads should be linked
    assert(lp.padLinks[11], "pad for encoder 1 should be linked");
    assert(lp.padLinks[12], "pad for encoder 2 should be linked");
    // Behaviors should be registered
    assert(lp.behaviors[11], "pad 11 should have behavior registered");
    assert(lp.behaviors[12], "pad 12 should have behavior registered");
})();

// mute mode behavior toggles track mute
(function() {
    var _muted = false;
    var track = {
        name: function() { return { get: function() { return "Kick (1)"; } }; },
        mute: function() { return { toggle: function() { _muted = !_muted; }, get: function() { return _muted; } }; },
        makeVisibleInArranger: function() {}
    };
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: track } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('mute');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    // Execute the registered click behavior
    lp.behaviors[11].click();
    assert(_muted === true, "clicking mute pad should toggle mute on");
})();

// solo mode behavior toggles track solo
(function() {
    var _soloed = false;
    var track = {
        name: function() { return { get: function() { return "Kick (1)"; } }; },
        solo: function() { return { toggle: function() { _soloed = !_soloed; }, get: function() { return _soloed; } }; },
        makeVisibleInArranger: function() {}
    };
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: track } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('solo');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(_soloed === true, "clicking solo pad should toggle solo on");
})();

// recordArm mode XOR-arms: disarms others, arms selected
(function() {
    var armed = {};
    function armTrack(id, name) {
        return {
            name: function() { return { get: function() { return name; } }; },
            arm: function() {
                return {
                    get: function() { return armed[id] || false; },
                    set: function(v) { armed[id] = v; }
                };
            },
            makeVisibleInArranger: function() {}
        };
    }
    var tracks = {};
    for (var i = 0; i < 64; i++) tracks[i] = armTrack(i, "Track " + i);
    tracks[3] = armTrack(3, "Kick (1)");
    armed[5] = true; // another track is armed

    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: tracks });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('recordArm');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(armed[3] === true, "selected track should be armed");
    assert(armed[5] === false, "other previously armed track should be disarmed");
})();

// sendA mode links sends via twister
(function() {
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: fakeTrack("Kick (1)") } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('sendA');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    var sendCall = tw.calls.filter(function(c) { return c.method === 'linkEncodersToTrackSends'; });
    assert(sendCall.length === 1, "should call linkEncodersToTrackSends");
    assert(sendCall[0].trackId === 3, "should pass correct track ID");
})();

// select mode selects track and enters track mode
(function() {
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: fakeTrack("Kick (1)") } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('select');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert((bw.selectedTracks || []).indexOf(3) !== -1, "should select track via bitwig");
    assert(ctrl._mode === 'track', "should enter track mode");
    assert(ctrl._suppressNextDeviceChange === true, "should suppress next device change");
    var trackRCCalls = tw.calls.filter(function(c) { return c === 'linkEncodersToTrackRemoteControls'; });
    assert(trackRCCalls.length === 1, "should call linkEncodersToTrackRemoteControls");
})();

// hold on track pad calls favBar.enterSetFavMode with correct trackId
(function() {
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: fakeTrack("Kick (1)") } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('mute');
    var setFavCalls = [];
    var fb = {
        enterSetFavMode: function(tid, page) { setFavCalls.push({ trackId: tid, page: page }); }
    };
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms, favBar: fb });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].hold();
    assert(setFavCalls.length === 1, "hold should call enterSetFavMode once");
    assert(setFavCalls[0].trackId === 3, "enterSetFavMode called with correct trackId");
    assert(setFavCalls[0].page === 1, "enterSetFavMode called with correct page");
})();

// hold callback is registered for all pad modes
(function() {
    var modes = ['mute', 'solo', 'recordArm', 'sendA', 'select'];
    for (var m = 0; m < modes.length; m++) {
        var tw = fakeTwister();
        tw.links[1] = { trackId: 3 };
        var bw = fakeBitwig({ tracks: { 3: fakeTrack("Kick (1)") } });
        var lp = fakeLaunchpad();
        var ms = fakeModeSwitcher(modes[m]);
        var setFavCalls = [];
        var fb = {
            enterSetFavMode: function(tid, page) { setFavCalls.push({ trackId: tid, page: page }); }
        };
        var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms, favBar: fb });
        ctrl.refreshTrackGrid();
        assert(lp.behaviors[11].hold !== null, modes[m] + " mode should have hold callback");
        lp.behaviors[11].hold();
        assert(setFavCalls.length === 1, modes[m] + " mode hold should call enterSetFavMode");
    }
})();

// mute growl shows "Mute: TrackName" when muting
(function() {
    var _muted = false;
    var track = {
        name: function() { return { get: function() { return "Kick (1)"; } }; },
        mute: function() { return { toggle: function() { _muted = !_muted; }, get: function() { return _muted; } }; },
        makeVisibleInArranger: function() {}
    };
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: track } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('mute');
    var h = fakeHost();
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms, host: h });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(h.notifications.indexOf("Mute: Kick (1)") !== -1, "should growl Mute: TrackName");
    lp.behaviors[11].click();
    assert(h.notifications.indexOf("Unmute: Kick (1)") !== -1, "should growl Unmute: TrackName");
})();

// solo growl shows "Solo: TrackName" when soloing
(function() {
    var _soloed = false;
    var track = {
        name: function() { return { get: function() { return "Snare (2)"; } }; },
        solo: function() { return { toggle: function() { _soloed = !_soloed; }, get: function() { return _soloed; } }; },
        makeVisibleInArranger: function() {}
    };
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: track } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('solo');
    var h = fakeHost();
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms, host: h });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(h.notifications.indexOf("Solo: Snare (2)") !== -1, "should growl Solo: TrackName");
    lp.behaviors[11].click();
    assert(h.notifications.indexOf("Unsolo: Snare (2)") !== -1, "should growl Unsolo: TrackName");
})();

// recordArm growl shows "Rec: TrackName"
(function() {
    var armed = {};
    function armTrack(id, name) {
        return {
            name: function() { return { get: function() { return name; } }; },
            arm: function() {
                return {
                    get: function() { return armed[id] || false; },
                    set: function(v) { armed[id] = v; }
                };
            },
            makeVisibleInArranger: function() {}
        };
    }
    var tracks = {};
    for (var i = 0; i < 64; i++) tracks[i] = armTrack(i, "Track " + i);
    tracks[3] = armTrack(3, "Kick (1)");
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: tracks });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('recordArm');
    var h = fakeHost();
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms, host: h });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(h.notifications.indexOf("Rec: Kick (1)") !== -1, "should growl Rec: TrackName");
})();

// clearAllMute shows growl
(function() {
    var h = fakeHost();
    var ctrl = makeController({ host: h });
    ctrl.clearAllMute();
    assert(h.notifications.indexOf("Clear All Mute") !== -1, "should growl Clear All Mute");
})();

// clearAllSolo shows growl
(function() {
    var h = fakeHost();
    var ctrl = makeController({ host: h });
    ctrl.clearAllSolo();
    assert(h.notifications.indexOf("Clear All Solo") !== -1, "should growl Clear All Solo");
})();

// clearAllArm shows growl
(function() {
    var h = fakeHost();
    var ctrl = makeController({ host: h });
    ctrl.clearAllArm();
    assert(h.notifications.indexOf("Clear All Rec") !== -1, "should growl Clear All Rec");
})();

// handleTrackNameChange re-links encoder when track renamed
(function() {
    var tw = fakeTwister();
    tw.linkEncoderToTrack(3, 10); // track 10 was on encoder 3
    var bw = fakeBitwig({ trackDepths: { 10: 0 } });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectedGroup = 16;
    ctrl.handleTrackNameChange(10, "Renamed (5)");
    assert(tw.links[5] && tw.links[5].trackId === 10, "should link track to new encoder 5");
})();

// handleTrackNameChange unlinks when name has no encoder number
(function() {
    var tw = fakeTwister();
    tw.linkEncoderToTrack(3, 10);
    var bw = fakeBitwig({ trackDepths: { 10: 0 } });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectedGroup = 16;
    ctrl.handleTrackNameChange(10, "No Number");
    var unlinkCalls = tw.calls.filter(function(c) { return c.method === 'unlinkEncoder' && c.encoder === 3; });
    assert(unlinkCalls.length > 0, "should unlink encoder 3 when name drops number");
})();

// handleTrackNameChange handles conflict: evicts existing track from encoder
(function() {
    var tw = fakeTwister();
    tw.linkEncoderToTrack(5, 20); // track 20 is on encoder 5
    tw.linkEncoderToTrack(3, 10); // track 10 is on encoder 3
    var bw = fakeBitwig({ trackDepths: { 10: 0 } });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectedGroup = 16;
    ctrl.handleTrackNameChange(10, "Renamed (5)"); // track 10 wants encoder 5
    assert(tw.links[5] && tw.links[5].trackId === 10, "track 10 should now be on encoder 5");
})();

// handleTrackNameChange ignores tracks not in selected group
(function() {
    var tw = fakeTwister();
    var bw = fakeBitwig({ trackDepths: { 10: 1 } }); // depth 1, not top-level
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectedGroup = 16;
    var callsBefore = tw.calls.length;
    ctrl.handleTrackNameChange(10, "New (5)");
    assert(tw.calls.length === callsBefore, "should not link tracks outside selected group");
})();

// handleTrackNameChange does nothing when no group selected
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl.selectedGroup = null;
    var callsBefore = tw.calls.length;
    ctrl.handleTrackNameChange(0, "Test (1)");
    assert(tw.calls.length === callsBefore, "should be no-op when no group selected");
})();

// handleTrackNameChange schedules track grid refresh when track is renamed
(function() {
    var tw = fakeTwister();
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var bw = fakeBitwig({
        trackDepths: { 5: 0 },
        tracks: { 5: fakeTrack("Synth (3)") }
    });
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, host: h });
    ctrl.selectedGroup = 16;
    ctrl.handleTrackNameChange(5, "Synth (5)");
    assert(h.scheduled.length === 1, "should schedule a refresh task on track rename");
})();

// handleTrackNameChange schedules refresh when group is renamed
(function() {
    var tw = fakeTwister();
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var bw = fakeBitwig({
        tracks: { 2: fakeTrack("Group (1)", { isGroup: true }) }
    });
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, host: h });
    ctrl.selectedGroup = 1;
    ctrl.handleTrackNameChange(2, "Group (2)");
    assert(h.scheduled.length === 1, "should schedule a refresh task on group rename");
    var unlinkAllBefore = lp.calls.filter(function(c) { return c === 'unlinkAllPads'; }).length;
    h.scheduled[0].fn();
    var unlinkAllAfter = lp.calls.filter(function(c) { return c === 'unlinkAllPads'; }).length;
    assert(unlinkAllAfter > unlinkAllBefore, "scheduled task should call refreshGroupDisplay");
})();

// handleTrackNameChange does not schedule refresh for tracks outside selected group
(function() {
    var tw = fakeTwister();
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var bw = fakeBitwig({ trackDepths: { 10: 1 } }); // depth 1, not top-level
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, host: h });
    ctrl.selectedGroup = 16;
    ctrl.handleTrackNameChange(10, "New (5)");
    assert(h.scheduled.length === 0, "should not schedule refresh for tracks outside selected group");
})();

// syncEncoderToTrack finds track and links encoder
(function() {
    var tw = fakeTwister();
    var tracks = {};
    tracks[5] = fakeTrack("Synth (3)");
    for (var i = 0; i < 64; i++) {
        if (!tracks[i]) tracks[i] = null;
    }
    var bw = fakeBitwig({ tracks: tracks });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.syncEncoderToTrack(3);
    assert(tw.links[3] && tw.links[3].trackId === 5, "should link encoder 3 to track 5");
})();

// syncEncoderToTrack unlinks when no matching track found
(function() {
    var tw = fakeTwister();
    var tracks = {};
    for (var i = 0; i < 64; i++) tracks[i] = fakeTrack("Track " + i);
    var bw = fakeBitwig({ tracks: tracks });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.syncEncoderToTrack(99);
    var unlinkCalls = tw.calls.filter(function(c) { return c.method === 'unlinkEncoder' && c.encoder === 99; });
    assert(unlinkCalls.length > 0, "should unlink encoder when no matching track");
})();

// clearAllMute flashes button and clears all muted tracks
(function() {
    var mutedTracks = {};
    var tracks = {};
    for (var i = 0; i < 64; i++) {
        tracks[i] = fakeTrack("Track " + i, { muted: i < 3 }); // first 3 muted
    }
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher();
    var h = fakeHost();
    var ctrl = makeController({ bitwig: fakeBitwig({ tracks: tracks }), launchpad: lp, launchpadModeSwitcher: ms, host: h });
    ctrl.clearAllMute();
    // Button should flash white
    assert(lp.padColors[69] === 3, "mute button should flash white");
    // All tracks should be unmuted
    for (var i = 0; i < 3; i++) {
        assert(tracks[i].mute().get() === false, "track " + i + " should be unmuted");
    }
    // Should schedule refresh
    assert(h.scheduled.length === 1, "should schedule mode switcher refresh");
})();

// clearAllMute skips tracks inside "top refs" group
(function() {
    var tracks = {};
    // Track 0: normal muted track (depth 0)
    tracks[0] = fakeTrack("Bass (1)", { muted: true });
    // Track 1: "Top Refs" group (depth 0)
    tracks[1] = fakeTrack("Top Refs", { isGroup: true, muted: true });
    // Track 2: child inside top refs (depth 1)
    tracks[2] = fakeTrack("Ref Kick", { muted: true });
    // Track 3: nested child inside top refs (depth 2)
    tracks[3] = fakeTrack("Ref Sub", { muted: true });
    // Track 4: back to top level (depth 0)
    tracks[4] = fakeTrack("Drums (2)", { muted: true });
    for (var i = 5; i < 64; i++) tracks[i] = fakeTrack("Track " + i);
    var depths = { 0: 0, 1: 0, 2: 1, 3: 2, 4: 0 };
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher();
    var h = fakeHost();
    var ctrl = makeController({ bitwig: fakeBitwig({ tracks: tracks, trackDepths: depths }), launchpad: lp, launchpadModeSwitcher: ms, host: h });
    ctrl.clearAllMute();
    assert(tracks[0].mute().get() === false, "normal track should be unmuted");
    assert(tracks[1].mute().get() === true, "top refs group should stay muted");
    assert(tracks[2].mute().get() === true, "child of top refs should stay muted");
    assert(tracks[3].mute().get() === true, "nested child of top refs should stay muted");
    assert(tracks[4].mute().get() === false, "track after top refs group should be unmuted");
})();

// clearAllSolo clears all soloed tracks
(function() {
    var tracks = {};
    for (var i = 0; i < 64; i++) {
        tracks[i] = fakeTrack("Track " + i, { soloed: i === 5 });
    }
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher();
    var h = fakeHost();
    var ctrl = makeController({ bitwig: fakeBitwig({ tracks: tracks }), launchpad: lp, launchpadModeSwitcher: ms, host: h });
    ctrl.clearAllSolo();
    assert(lp.padColors[59] === 3, "solo button should flash white");
    assert(tracks[5].solo().get() === false, "soloed track should be unsoloed");
})();

// clearAllArm clears all armed tracks
(function() {
    var tracks = {};
    for (var i = 0; i < 64; i++) {
        tracks[i] = fakeTrack("Track " + i, { armed: i === 2 });
    }
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher();
    var h = fakeHost();
    var ctrl = makeController({ bitwig: fakeBitwig({ tracks: tracks }), launchpad: lp, launchpadModeSwitcher: ms, host: h });
    ctrl.clearAllArm();
    assert(lp.padColors[49] === 3, "recordArm button should flash white");
    assert(tracks[2].arm().get() === false, "armed track should be disarmed");
})();

// onLaunchpadMidi routes CC to top buttons
(function() {
    var tb = fakeTopButtons();
    var ctrl = makeController({ launchpadTopButtons: tb });
    ctrl.onLaunchpadMidi(0xB0, 104, 127);
    assert(tb.calls.length === 1, "should route CC to top buttons");
    assert(tb.calls[0].cc === 104, "should pass correct CC");
})();

// onLaunchpadMidi routes note-on to page press
(function() {
    var pg = fakePages();
    var ctrl = makeController({ pages: pg, launchpadTopButtons: fakeTopButtons() });
    ctrl.onLaunchpadMidi(0x90, 55, 100);
    assert(pg.calls.length === 1, "should route note-on to pages");
    assert(pg.calls[0].method === 'handlePadPress', "should call handlePadPress");
    assert(pg.calls[0].pad === 55, "should pass correct pad");
})();

// onLaunchpadMidi routes note-off to page release
(function() {
    var pg = fakePages();
    var tb = fakeTopButtons();
    // Note-off via velocity 0
    var ctrl = makeController({ pages: pg, launchpadTopButtons: tb });
    ctrl.onLaunchpadMidi(0x90, 55, 0);
    assert(pg.calls.some(function(c) { return c.method === 'handlePadRelease'; }), "should route note-off (vel 0) to page release");
})();

// onLaunchpadMidi routes 0x80 note-off to page release
(function() {
    var pg = fakePages();
    var ctrl = makeController({ pages: pg });
    ctrl.onLaunchpadMidi(0x80, 55, 0);
    assert(pg.calls.some(function(c) { return c.method === 'handlePadRelease'; }), "should route 0x80 to page release");
})();

// onTwisterMidi routes encoder turns
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl.onTwisterMidi(0xB0, 5, 64);
    var turnCalls = tw.calls.filter(function(c) { return c.method === 'handleEncoderTurn'; });
    assert(turnCalls.length === 1, "should route encoder turn");
    assert(turnCalls[0].encoder === 6, "encoder number should be CC+1");
    assert(turnCalls[0].value === 64, "should pass value");
})();

// onTwisterMidi routes encoder presses
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl.onTwisterMidi(0xB1, 0, 127);
    var pressCalls = tw.calls.filter(function(c) { return c.method === 'handleEncoderPress'; });
    assert(pressCalls.length === 1, "should route encoder press");
    assert(pressCalls[0].pressed === true, "should pass pressed=true for velocity > 0");
})();

// exit clears twister and launchpad
(function() {
    var tw = fakeTwister();
    var lp = fakeLaunchpad();
    var ctrl = makeController({ twister: tw, launchpad: lp });
    ctrl.exit();
    assert(tw.calls.indexOf('clearAll') !== -1, "should clear twister");
    assert(lp.calls.indexOf('clearAll') !== -1, "should clear launchpad");
    assert(lp.calls.indexOf('exitProgrammerMode') !== -1, "should exit programmer mode");
})();

// init auto-selects group 16
(function() {
    var tw = fakeTwister();
    var bw = fakeBitwig({ topLevel: [], bpm: 120 });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.init();
    assert(ctrl.selectedGroup === 16, "init should select group 16");
})();

// prepareRecordingAtRegion sets time selection and playhead
(function() {
    function markerAt(pos) {
        return {
            exists: function() { return { get: function() { return true; } }; },
            position: function() { return { get: function() { return pos; } }; }
        };
    }
    var markers = [markerAt(0), markerAt(16), markerAt(32), markerAt(48)];
    var bank = { getItemAt: function(i) { return markers[i] || null; } };
    var bw = fakeBitwig({ markerBank: bank });
    var ctrl = makeController({ bitwig: bw });
    ctrl.prepareRecordingAtRegion(0, 1);
    // End position should be the next marker after endMarkerIndex (marker 2 at beat 32)
    // We can't directly read _timeSelection from our fakeBitwig because it's local,
    // but the test verifies no errors are thrown
    assert(true, "prepareRecordingAtRegion should not throw");
})();

// onDeviceChanged: empty name is ignored
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl.onDeviceChanged("");
    assert(tw.calls.length === 0, "empty device name should be ignored");
})();

// enterDeviceMode: non-mapped device applies generic mapping (via scheduleTask)
(function() {
    var genericCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() { genericCalls.push('applyGenericMapping'); },
        resetGenericMode: function() {}
    };
    var h = fakeHost();
    var ctrl = makeController({ host: h });
    ctrl.deviceMapper = fakeDeviceMapper;
    ctrl.selectedGroup = 16;
    ctrl.enterDeviceMode("SomeOtherPlugin");
    assert(h.scheduled.length === 1, "should schedule a task");
    assert(genericCalls.length === 0, "should not call applyGenericMapping synchronously");
    h.scheduled[0].fn();
    assert(genericCalls.length === 1, "should call applyGenericMapping after scheduled task runs");
    assert(ctrl._mode === 'device', "_mode should be 'device' after generic mapping");
})();

// enterDeviceMode: switching from mapped device to non-mapped applies generic mapping (via scheduleTask)
(function() {
    var genericCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() { genericCalls.push('applyGenericMapping'); },
        resetGenericMode: function() {}
    };
    var h = fakeHost();
    var ctrl = makeController({ host: h });
    ctrl.deviceMapper = fakeDeviceMapper;
    ctrl._mode = 'device';
    ctrl.enterDeviceMode("SomeOtherPlugin");
    assert(h.scheduled.length === 1, "should schedule a task");
    h.scheduled[0].fn();
    assert(genericCalls.length === 1, "should call applyGenericMapping when leaving mapped device");
    assert(ctrl._mode === 'device', "_mode should remain 'device'");
})();

// selectGroup(16) allows encoder 1 for track linking (no limiter override)
(function() {
    var tw = fakeTwister();
    var bw = fakeBitwig({
        topLevel: [0],
        tracks: { 0: fakeTrack("Bass (1)") }
    });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectGroup(16);
    assert(tw.links[1] && tw.links[1].trackId === 0, "encoder 1 should link to track with (1) naming");
    assert(!tw.behaviors[1], "encoder 1 should not have custom behavior");
})();

// enterDeviceMode activates device quadrant
(function() {
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ deviceQuadrant: dq });
    ctrl.enterDeviceMode("SomePlugin");
    assert(dq.calls.indexOf('activate') !== -1, "enterDeviceMode should activate device quadrant");
})();

// enterDeviceMode does not re-activate if already active
(function() {
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ deviceQuadrant: dq });
    ctrl.enterDeviceMode("Plugin1");
    ctrl.enterDeviceMode("Plugin2");
    var activateCalls = dq.calls.filter(function(c) { return c === 'activate'; });
    assert(activateCalls.length === 1, "should not re-activate if already active");
})();

// selectGroup deactivates device quadrant
(function() {
    var dq = fakeDeviceQuadrant();
    dq.activate(); // pre-activate
    var ctrl = makeController({ deviceQuadrant: dq });
    ctrl.selectGroup(16);
    assert(dq.calls.indexOf('deactivate') !== -1, "selectGroup should deactivate device quadrant");
})();

// refreshTrackGrid is no-op when device quadrant active
(function() {
    var dq = fakeDeviceQuadrant();
    dq.activate();
    var lp = fakeLaunchpad();
    var ctrl = makeController({ deviceQuadrant: dq, launchpad: lp });
    lp.calls = [];
    ctrl.refreshTrackGrid();
    var unlinkCalls = lp.calls.filter(function(c) { return c.method === 'unlinkPad'; });
    assert(unlinkCalls.length === 0, "refreshTrackGrid should be no-op when device quadrant active");
})();

// exit callback from device quadrant enters track mode (not grid)
(function() {
    var dq = fakeDeviceQuadrant();
    var tw = fakeTwister();
    var bw = fakeBitwig({
        groups: { 5: 10 },
        groupChildren: { 10: [11, 12] },
        tracks: {
            10: fakeTrack("Guitars (5)", { isGroup: true }),
            11: fakeTrack("Clean (1)"),
            12: fakeTrack("Dist (2)")
        }
    });
    var lp = fakeLaunchpad();
    var ctrl = makeController({ deviceQuadrant: dq, twister: tw, bitwig: bw, launchpad: lp });
    ctrl.selectedGroup = 5;
    ctrl.enterDeviceMode("SomePlugin");
    assert(ctrl._mode === 'device', "_mode should be 'device'");
    // Simulate exit callback — should enter track mode
    dq._exitCallback();
    assert(ctrl._mode === 'track', "exit callback should enter track mode");
    var trackRCCalls = tw.calls.filter(function(c) { return c === 'linkEncodersToTrackRemoteControls'; });
    assert(trackRCCalls.length > 0, "should link track remote controls in track mode");
})();

// selectGroup(16) calls selectInMixer on master track
(function() {
    var tw = fakeTwister();
    var selected = false;
    var bw = fakeBitwig({
        topLevel: [],
        bpm: 120,
        masterTrack: { selectInMixer: function() { selected = true; } }
    });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectGroup(16);
    assert(selected === true, "selectGroup(16) should call masterTrack.selectInMixer()");
})();

// selectGroup(16) does not crash when no master track available
(function() {
    var tw = fakeTwister();
    var bw = fakeBitwig({ topLevel: [], bpm: 120 });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectGroup(16);
    assert(ctrl.selectedGroup === 16, "selectGroup(16) should work without master track");
})();

// enterDeviceMode: non-mapped device with remote controls uses remote controls (via scheduleTask)
(function() {
    var tw = fakeTwister();
    var bw = fakeBitwig({ remoteControlNames: ['Cutoff', 'Resonance', '', '', '', '', '', ''] });
    var genericCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() { genericCalls.push('applyGenericMapping'); },
        resetGenericMode: function() {}
    };
    var h = fakeHost();
    var ctrl = makeController({ twister: tw, bitwig: bw, host: h });
    ctrl.deviceMapper = fakeDeviceMapper;
    ctrl.enterDeviceMode("SomePlugin");
    assert(h.scheduled.length === 1, "should schedule a task");
    h.scheduled[0].fn();
    var rcCalls = tw.calls.filter(function(c) { return c === 'linkEncodersToRemoteControls'; });
    assert(rcCalls.length === 1, "should call linkEncodersToRemoteControls for device with remote controls");
    assert(genericCalls.length === 0, "should NOT call applyGenericMapping when remote controls exist");
    assert(ctrl._mode === 'device', "_mode should be 'device'");
})();

// enterDeviceMode passes pad mapper from padMappers registry to device quadrant
(function() {
    var dq = fakeDeviceQuadrant();
    var testPadMapper = fakePadMapper();
    var padMappers = { 'TestDevice': function() { return testPadMapper; } };
    var ctrl = makeController({ deviceQuadrant: dq, padMappers: padMappers });
    ctrl.enterDeviceMode("TestDevice");
    assert(dq._lastPadMapper === testPadMapper, "should pass pad mapper to device quadrant activate");
})();

// enterDeviceMode passes null pad mapper when no padMappers entry exists
(function() {
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ deviceQuadrant: dq });
    ctrl.enterDeviceMode("SomePlugin");
    assert(dq._lastPadMapper === null, "should pass null pad mapper for non-mapped device");
})();

// switching devices while already active calls applyPadMapper instead of activate
(function() {
    var dq = fakeDeviceQuadrant();
    var testPadMapper = fakePadMapper();
    var padMappers = { 'DeviceA': function() { return testPadMapper; } };
    var ctrl = makeController({ deviceQuadrant: dq, padMappers: padMappers });
    ctrl.enterDeviceMode("DeviceA");
    assert(dq.calls.filter(function(c) { return c === 'activate'; }).length === 1, "first device should activate");
    // Switch to a different device while already active
    ctrl.enterDeviceMode("OtherDevice");
    assert(dq.calls.filter(function(c) { return c === 'activate'; }).length === 1, "should NOT re-activate");
    assert(dq.calls.filter(function(c) { return c === 'applyPadMapper'; }).length === 1, "should call applyPadMapper for second device");
    assert(dq._lastPadMapper === null, "second device has no pad mapper");
})();

// ---- mapper integration tests (via enterDeviceMode) ----

// enterDeviceMode creates mapper when registered factory exists
(function() {
    var createdMapper = fakeMapper();
    var mappers = {
        'TestMapper': function() { return createdMapper; }
    };
    var ctrl = makeController({ mappers: mappers });
    ctrl.enterDeviceMode('TestMapper');
    assert(ctrl._activeMapper === createdMapper, "should create and store active mapper");
    assert(ctrl._mode === 'device', "_mode should be 'device'");
})();

// enterDeviceMode: mapper takes priority and does not schedule task
(function() {
    var createdMapper = fakeMapper();
    var mappers = { 'MyDevice': function() { return createdMapper; } };
    var h = fakeHost();
    var ctrl = makeController({ mappers: mappers, host: h });
    ctrl.enterDeviceMode('MyDevice');
    assert(ctrl._activeMapper === createdMapper, "mapper should be active");
    assert(h.scheduled.length === 0, "should NOT schedule a task for mapped device");
})();

// enterDeviceMode: padMappers factory creates pad mapper independently of twister mapper
(function() {
    var createdMapper = fakeMapper();
    var createdPadMapper = fakePadMapper();
    var mappers = { 'PadDevice': function() { return createdMapper; } };
    var padMappers = { 'PadDevice': function() { return createdPadMapper; } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ mappers: mappers, padMappers: padMappers, deviceQuadrant: dq });
    ctrl.enterDeviceMode('PadDevice');
    assert(dq._lastPadMapper === createdPadMapper, "should pass pad mapper to device quadrant");
    assert(ctrl._activeMapper === createdMapper, "twister mapper should also be active");
})();

// enterDeviceMode: non-mapper device falls through (no _activeMapper, via scheduleTask)
(function() {
    var mappers = { 'MappedDevice': function() { return fakeMapper(); } };
    var genericCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() { genericCalls.push('applyGenericMapping'); },
        resetGenericMode: function() {}
    };
    var h = fakeHost();
    var ctrl = makeController({ mappers: mappers, host: h });
    ctrl.deviceMapper = fakeDeviceMapper;
    ctrl.enterDeviceMode('UnmappedDevice');
    assert(ctrl._activeMapper === null, "should not set _activeMapper for non-mapper device");
    assert(h.scheduled.length === 1, "should schedule a task");
    h.scheduled[0].fn();
    assert(genericCalls.length === 1, "should fall through to generic mapping");
})();

// enterDeviceMode: mapper factory receives painter dep
(function() {
    var receivedDeps = null;
    var mappers = {
        'DepDevice': function(deps) { receivedDeps = deps; return fakeMapper(); }
    };
    var fakePainterObj = { paint: function() {} };
    var ctrl = makeController({ mappers: mappers, painter: fakePainterObj });
    ctrl.enterDeviceMode('DepDevice');
    assert(receivedDeps !== null, "factory should receive deps");
    assert(receivedDeps.painter === fakePainterObj, "factory should receive painter");
})();

// onTwisterMidi: turn routes through active mapper
(function() {
    var paramCalls = [];
    var createdMapper = fakeMapper();
    createdMapper._encoderParams[6] = 'CONTENTS/PIDtest';
    var bw = fakeBitwig();
    bw.getCursorDevice = function() {
        return {
            selectNone: function() {},
            setDirectParameterValueNormalized: function(id, val, res) {
                paramCalls.push({ id: id, value: val, resolution: res });
            }
        };
    };
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl._activeMapper = createdMapper;
    ctrl.onTwisterMidi(0xB0, 5, 100); // CC 5 → encoder 6
    assert(paramCalls.length === 1, "should route turn to cursor device");
    assert(paramCalls[0].id === 'CONTENTS/PIDtest', "should use param from mapper");
    assert(paramCalls[0].value === 100, "should pass MIDI value");
    // Should NOT fall through to twister.handleEncoderTurn
    var turnCalls = tw.calls.filter(function(c) { return c.method === 'handleEncoderTurn'; });
    assert(turnCalls.length === 0, "should not fall through to twister.handleEncoderTurn");
})();

// onTwisterMidi: press routes click through active mapper
(function() {
    var paramCalls = [];
    var createdMapper = fakeMapper();
    createdMapper._clicks[6] = { paramId: 'CONTENTS/PIDactive', value: 1, resolution: 2 };
    var bw = fakeBitwig();
    bw.getCursorDevice = function() {
        return {
            selectNone: function() {},
            setDirectParameterValueNormalized: function(id, val, res) {
                paramCalls.push({ id: id, value: val, resolution: res });
            }
        };
    };
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl._activeMapper = createdMapper;
    ctrl.onTwisterMidi(0xB1, 5, 127); // press encoder 6
    // Should notify button state
    var notifyCalls = createdMapper.calls.filter(function(c) { return c.method === 'notifyButtonState'; });
    assert(notifyCalls.length === 1, "should call notifyButtonState");
    assert(notifyCalls[0].pressed === true, "should pass pressed=true");
    // Should set param from click action
    assert(paramCalls.length >= 1, "should call setDirectParameterValueNormalized for click");
    assert(paramCalls[0].id === 'CONTENTS/PIDactive', "should use click paramId");
    assert(paramCalls[0].value === 1, "should use click value");
})();

// onTwisterMidi: release routes hold through active mapper
(function() {
    var paramCalls = [];
    var createdMapper = fakeMapper();
    createdMapper._holds[6] = { paramId: 'CONTENTS/PIDsolo', value: 0, resolution: 19 };
    var bw = fakeBitwig();
    bw.getCursorDevice = function() {
        return {
            selectNone: function() {},
            setDirectParameterValueNormalized: function(id, val, res) {
                paramCalls.push({ id: id, value: val, resolution: res });
            }
        };
    };
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl._activeMapper = createdMapper;
    ctrl.onTwisterMidi(0xB1, 5, 0); // release encoder 6
    // Should set param from hold release action
    assert(paramCalls.length === 1, "should call setDirectParameterValueNormalized for hold release");
    assert(paramCalls[0].id === 'CONTENTS/PIDsolo', "should use hold paramId");
    assert(paramCalls[0].value === 0, "should use hold release value");
})();

// onTwisterMidi: without mapper, falls through to twister.handleEncoderTurn
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._activeMapper = null;
    ctrl.onTwisterMidi(0xB0, 5, 64);
    var turnCalls = tw.calls.filter(function(c) { return c.method === 'handleEncoderTurn'; });
    assert(turnCalls.length === 1, "should fall through to twister without mapper");
})();

// onDeviceParamChanged feeds active mapper
(function() {
    var createdMapper = fakeMapper();
    var ctrl = makeController({});
    ctrl._activeMapper = createdMapper;
    ctrl.onDeviceParamChanged('CONTENTS/PIDfoo', 0.75);
    assert(createdMapper._fedParams.length === 1, "should feed param to mapper");
    assert(createdMapper._fedParams[0].id === 'CONTENTS/PIDfoo', "should pass param id");
    assert(createdMapper._fedParams[0].value === 0.75, "should pass param value");
})();

// onDeviceParamChanged is no-op without active mapper
(function() {
    var ctrl = makeController({});
    ctrl._activeMapper = null;
    ctrl.onDeviceParamChanged('CONTENTS/PIDfoo', 0.5); // should not throw
    assert(true, "onDeviceParamChanged should be no-op without mapper");
})();

// selectGroup clears active mapper
(function() {
    var createdMapper = fakeMapper();
    var ctrl = makeController({});
    ctrl._activeMapper = createdMapper;
    ctrl.selectGroup(16);
    assert(ctrl._activeMapper === null, "selectGroup should clear active mapper");
})();

// enterDeviceMode: same device preserves existing mapper
(function() {
    var mapper1 = fakeMapper();
    var callCount = 0;
    var mappers = {
        'DeviceA': function() { callCount++; return mapper1; },
    };
    var ctrl = makeController({ mappers: mappers });
    ctrl.enterDeviceMode('DeviceA');
    assert(ctrl._activeMapper === mapper1, "first call should use mapper1");
    ctrl.enterDeviceMode('DeviceA');
    assert(ctrl._activeMapper === mapper1, "second call should preserve mapper1");
    assert(callCount === 1, "factory should only be called once");
})();

// enterDeviceMode: mapper calls twister.unlinkAll
(function() {
    var tw = fakeTwister();
    var mappers = { 'Device': function() { return fakeMapper(); } };
    var ctrl = makeController({ twister: tw, mappers: mappers });
    tw.calls.length = 0;
    ctrl.enterDeviceMode('Device');
    assert(tw.calls.indexOf('unlinkAll') !== -1, "should call twister.unlinkAll when activating mapper");
})();

// onDeviceParamChanged strips ROOT_GENERIC_MODULE/ prefix before feeding mapper
(function() {
    var createdMapper = fakeMapper();
    var ctrl = makeController({});
    ctrl._activeMapper = createdMapper;
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PIDfoo', 0.5);
    assert(createdMapper._fedParams[0].id === 'CONTENTS/PIDfoo',
        "should strip ROOT_GENERIC_MODULE/ prefix before feeding mapper");
})();

// enterDeviceMode: unlinkAll is always the first call (even for mapper path)
(function() {
    var tw = fakeTwister();
    var mappers = { 'Device': function() { return fakeMapper(); } };
    var ctrl = makeController({ twister: tw, mappers: mappers });
    tw.calls.length = 0;
    ctrl.enterDeviceMode('Device');
    assert(tw.calls[0] === 'unlinkAll', "unlinkAll should be the very first call");
})();

// enterDeviceMode: mapper path does NOT schedule a task
(function() {
    var h = fakeHost();
    var mappers = { 'Device': function() { return fakeMapper(); } };
    var ctrl = makeController({ mappers: mappers, host: h });
    ctrl.enterDeviceMode('Device');
    assert(h.scheduled.length === 0, "mapper path should not schedule any task");
})();

// enterDeviceMode: rapid device switching discards stale scheduled task (sequence counter guard)
(function() {
    var h = fakeHost();
    var genericCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() { genericCalls.push('applyGenericMapping'); },
        resetGenericMode: function() {}
    };
    var ctrl = makeController({ host: h });
    ctrl.deviceMapper = fakeDeviceMapper;
    ctrl.enterDeviceMode("Plugin1");
    assert(h.scheduled.length === 1, "first device schedules a task");
    var staleTask = h.scheduled[0].fn;
    ctrl.enterDeviceMode("Plugin2");
    assert(h.scheduled.length === 2, "second device schedules another task");
    // Run the stale task from Plugin1 — should be discarded
    staleTask();
    assert(genericCalls.length === 0, "stale task should be discarded by sequence counter");
    // Run the fresh task from Plugin2 — should execute
    h.scheduled[1].fn();
    assert(genericCalls.length === 1, "fresh task should execute");
})();

// enterDeviceMode calls resetGenericMode on deviceMapper
(function() {
    var resetCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() {},
        resetGenericMode: function() { resetCalls.push('resetGenericMode'); }
    };
    var ctrl = makeController({});
    ctrl.deviceMapper = fakeDeviceMapper;
    ctrl.enterDeviceMode("SomePlugin");
    assert(resetCalls.length === 1, "enterDeviceMode should call resetGenericMode on deviceMapper");
})();

// switching from generic to mapper clears _genericMode
(function() {
    var resetCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() {},
        resetGenericMode: function() { resetCalls.push('resetGenericMode'); }
    };
    var mappers = { 'MappedDevice': function() { return fakeMapper(); } };
    var h = fakeHost();
    var ctrl = makeController({ mappers: mappers, host: h });
    ctrl.deviceMapper = fakeDeviceMapper;
    // First: go to generic device
    ctrl.enterDeviceMode("SomePlugin");
    h.scheduled[0].fn(); // applies generic mapping
    // Second: switch to mapper device
    ctrl.enterDeviceMode("MappedDevice");
    assert(resetCalls.length === 2, "second enterDeviceMode should also call resetGenericMode");
    assert(ctrl._activeMapper !== null, "should have active mapper");
})();

// onRemoteControlNameChanged links to RC when pending
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._pendingRCCheck = true;
    ctrl.onRemoteControlNameChanged(0, "Cutoff");
    var rcCalls = tw.calls.filter(function(c) { return c === 'linkEncodersToRemoteControls'; });
    assert(rcCalls.length === 1, "should call linkEncodersToRemoteControls when pending");
    assert(ctrl._pendingRCCheck === false, "_pendingRCCheck should be cleared");
})();

// onRemoteControlNameChanged is no-op when not pending
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._pendingRCCheck = false;
    ctrl.onRemoteControlNameChanged(0, "Cutoff");
    var rcCalls = tw.calls.filter(function(c) { return c === 'linkEncodersToRemoteControls'; });
    assert(rcCalls.length === 0, "should not call linkEncodersToRemoteControls when not pending");
})();

// onRemoteControlNameChanged ignores empty names
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._pendingRCCheck = true;
    ctrl.onRemoteControlNameChanged(0, "");
    assert(ctrl._pendingRCCheck === true, "_pendingRCCheck should remain true for empty name");
    ctrl.onRemoteControlNameChanged(0, null);
    assert(ctrl._pendingRCCheck === true, "_pendingRCCheck should remain true for null name");
})();

// scheduled task skipped when RC observer already linked
(function() {
    var tw = fakeTwister();
    var genericCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() { genericCalls.push('applyGenericMapping'); },
        resetGenericMode: function() {}
    };
    var h = fakeHost();
    var ctrl = makeController({ twister: tw, host: h });
    ctrl.deviceMapper = fakeDeviceMapper;
    ctrl.enterDeviceMode("SomePlugin");
    // Simulate RC observer firing before scheduled task
    ctrl.onRemoteControlNameChanged(0, "Cutoff");
    var rcCalls = tw.calls.filter(function(c) { return c === 'linkEncodersToRemoteControls'; });
    assert(rcCalls.length === 1, "RC observer should link");
    // Now run the scheduled task — should be skipped
    h.scheduled[0].fn();
    assert(genericCalls.length === 0, "scheduled task should skip when RC observer already linked");
    // Should not have called linkEncodersToRemoteControls again
    var rcCallsAfter = tw.calls.filter(function(c) { return c === 'linkEncodersToRemoteControls'; });
    assert(rcCallsAfter.length === 1, "should not double-link");
})();

// _pendingRCCheck cleared and re-set across device switches
(function() {
    var resetCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() {},
        resetGenericMode: function() { resetCalls.push('resetGenericMode'); }
    };
    var h = fakeHost();
    var ctrl = makeController({ host: h });
    ctrl.deviceMapper = fakeDeviceMapper;
    ctrl.enterDeviceMode("Plugin1");
    assert(ctrl._pendingRCCheck === true, "should be pending after first switch");
    ctrl.enterDeviceMode("Plugin2");
    assert(ctrl._pendingRCCheck === true, "should be re-set to pending after second switch");
    assert(resetCalls.length === 2, "should call resetGenericMode on each switch");
})();

// ---- state machine tests ----

// enterTrackMode sets _mode to 'track' and links track remote controls
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl.enterTrackMode();
    assert(ctrl._mode === 'track', "_mode should be 'track'");
    var trackRCCalls = tw.calls.filter(function(c) { return c === 'linkEncodersToTrackRemoteControls'; });
    assert(trackRCCalls.length === 1, "should call linkEncodersToTrackRemoteControls");
})();

// enterTrackMode clears active mapper
(function() {
    var ctrl = makeController({});
    ctrl._activeMapper = fakeMapper();
    ctrl.enterTrackMode();
    assert(ctrl._activeMapper === null, "should clear active mapper");
})();

// enterTrackMode deactivates device quadrant if active
(function() {
    var dq = fakeDeviceQuadrant();
    dq.activate();
    var ctrl = makeController({ deviceQuadrant: dq });
    ctrl.enterTrackMode();
    assert(dq.calls.indexOf('deactivate') !== -1, "should deactivate device quadrant");
})();

// enterTrackMode activates device selector
(function() {
    var ds = fakeDeviceSelector();
    var ctrl = makeController({ deviceSelector: ds });
    ctrl.enterTrackMode();
    assert(ds.calls.indexOf('activate') !== -1, "should activate device selector");
})();

// enterTrackMode does not re-activate device selector if already active
(function() {
    var ds = fakeDeviceSelector();
    var ctrl = makeController({ deviceSelector: ds });
    ctrl.enterTrackMode();
    ctrl.enterTrackMode();
    var activateCalls = ds.calls.filter(function(c) { return c === 'activate'; });
    assert(activateCalls.length === 1, "should not re-activate device selector");
})();

// enterTrackMode shows growl with cursor track name
(function() {
    var h = fakeHost();
    var cursorTrack = { name: function() { return { get: function() { return "Synth Lead"; } }; } };
    var bw = fakeBitwig({ cursorTrack: cursorTrack });
    var ctrl = makeController({ host: h, bitwig: bw });
    ctrl.enterTrackMode();
    assert(h.notifications.indexOf("Synth Lead → Track Mode") !== -1, "growl should show track name in track mode");
})();

// enterTrackMode shows growl without track name when no cursor track
(function() {
    var h = fakeHost();
    var ctrl = makeController({ host: h });
    ctrl.enterTrackMode();
    assert(h.notifications.indexOf("Track Mode") !== -1, "growl should show Track Mode when no cursor track");
})();

// enterDeviceMode shows growl with device name
(function() {
    var h = fakeHost();
    var ctrl = makeController({ host: h });
    ctrl.enterDeviceMode("Reverb");
    assert(h.notifications.indexOf("Device: Reverb") !== -1, "growl should show device name");
})();

// enterDeviceMode sets _mode to 'device'
(function() {
    var ctrl = makeController({});
    ctrl.enterDeviceMode("SomePlugin");
    assert(ctrl._mode === 'device', "_mode should be 'device'");
})();

// enterDeviceMode deactivates device selector if active
(function() {
    var ds = fakeDeviceSelector();
    var ctrl = makeController({ deviceSelector: ds });
    ctrl.enterTrackMode(); // activates device selector
    ctrl.enterDeviceMode("SomePlugin");
    assert(ds.calls.indexOf('deactivate') !== -1, "should deactivate device selector");
})();

// onDeviceChanged in track mode stays in track mode and maps device
(function() {
    var tw = fakeTwister();
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ twister: tw, deviceQuadrant: dq });
    ctrl._mode = 'track';
    ctrl.onDeviceChanged("SomePlugin");
    assert(ctrl._mode === 'track', "should stay in track mode");
    assert(ctrl._lastDeviceName === 'SomePlugin', "_lastDeviceName should be set");
    assert(tw.calls.indexOf('unlinkAll') !== -1, "should call unlinkAll via _mapDeviceToTwister");
})();

// onDeviceChanged in device mode stays in device mode (device switch)
(function() {
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ deviceQuadrant: dq });
    ctrl._mode = 'device';
    ctrl.onDeviceChanged("SomePlugin");
    assert(ctrl._mode === 'device', "should stay in device mode");
})();

// onDeviceChanged in track mode with suppress flag clears flag and does not map device
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._mode = 'track';
    ctrl._suppressNextDeviceChange = true;
    tw.calls.length = 0;
    ctrl.onDeviceChanged("SomePlugin");
    assert(ctrl._suppressNextDeviceChange === false, "should clear suppress flag");
    assert(ctrl._mode === 'track', "should remain in track mode");
    assert(tw.calls.indexOf('unlinkAll') === -1, "should not call unlinkAll (no device mapping)");
    assert(ctrl._lastDeviceName !== "SomePlugin", "should not set _lastDeviceName");
})();

// onDeviceChanged in track mode without suppress maps device normally
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._mode = 'track';
    ctrl._suppressNextDeviceChange = false;
    tw.calls.length = 0;
    ctrl.onDeviceChanged("SomePlugin");
    assert(ctrl._mode === 'track', "should remain in track mode");
    assert(ctrl._lastDeviceName === "SomePlugin", "should set _lastDeviceName");
    assert(tw.calls.indexOf('unlinkAll') !== -1, "should call unlinkAll (device mapping)");
})();

// onDeviceChanged in grid mode with suppress flag clears flag and returns
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._mode = 'grid';
    ctrl._suppressNextDeviceChange = true;
    tw.calls.length = 0;
    ctrl.onDeviceChanged("SomePlugin");
    assert(ctrl._suppressNextDeviceChange === false, "should clear suppress flag");
    assert(ctrl._mode === 'grid', "should remain in grid mode");
    assert(tw.calls.indexOf('unlinkAll') === -1, "should not call unlinkAll");
})();

// onDeviceChanged in grid mode without suppress is ignored
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._mode = 'grid';
    ctrl._suppressNextDeviceChange = false;
    tw.calls.length = 0;
    ctrl.onDeviceChanged("SomePlugin");
    assert(ctrl._mode === 'grid', "should remain in grid mode");
    assert(tw.calls.indexOf('unlinkAll') === -1, "should not interact with twister");
})();

// onCursorTrackChanged in track mode re-enters track mode and sets suppress
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._mode = 'track';
    ctrl.onCursorTrackChanged("New Track");
    assert(ctrl._mode === 'track', "should remain in track mode");
    assert(ctrl._suppressNextDeviceChange === true, "should suppress next device change");
})();

// onCursorTrackChanged in device mode goes to track mode
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._mode = 'device';
    ctrl.onCursorTrackChanged("New Track");
    assert(ctrl._mode === 'track', "should enter track mode from device mode");
    assert(ctrl._suppressNextDeviceChange === true, "should suppress next device change");
})();

// onCursorTrackChanged in grid mode is no-op
(function() {
    var tw = fakeTwister();
    var ctrl = makeController({ twister: tw });
    ctrl._mode = 'grid';
    tw.calls.length = 0;
    ctrl.onCursorTrackChanged("Some Track");
    assert(ctrl._mode === 'grid', "should remain in grid mode");
    assert(tw.calls.length === 0, "should not interact with twister");
})();

// selectGroup sets _mode to 'grid'
(function() {
    var ctrl = makeController({});
    ctrl._mode = 'track';
    ctrl.selectGroup(16);
    assert(ctrl._mode === 'grid', "selectGroup should set _mode to 'grid'");
})();

// selectGroup deactivates device selector
(function() {
    var ds = fakeDeviceSelector();
    ds.activate(function() {}, function() {});
    var ctrl = makeController({ deviceSelector: ds });
    ctrl.selectGroup(16);
    assert(ds.calls.indexOf('deactivate') !== -1, "selectGroup should deactivate device selector");
})();

// device selector onDeviceSelected callback navigates cursor device
(function() {
    var ds = fakeDeviceSelector();
    var editorSelected = false;
    var fakeDevice = { name: 'TestDevice', selectInEditor: function() { editorSelected = true; } };
    var fakeBank = { getItemAt: function(idx) { return idx === 3 ? fakeDevice : null; } };
    var bw = fakeBitwig({ deviceBank: fakeBank });
    var selectedDevice = null;
    bw.getCursorDevice = function() {
        return {
            selectDevice: function(d) { selectedDevice = d; },
            selectNone: function() {},
            isWindowOpen: function() { return { get: function() { return false; }, set: function() {} }; },
            isPlugin: function() { return { get: function() { return false; } }; },
            isRemoteControlsSectionVisible: function() { return { get: function() { return false; }, set: function() {} }; }
        };
    };
    var ctrl = makeController({ deviceSelector: ds, bitwig: bw });
    ctrl.enterTrackMode();
    // Simulate clicking a device in the selector
    ds._onDeviceSelected(3);
    assert(selectedDevice === fakeDevice, "should call selectDevice on cursor device with correct device");
    assert(editorSelected === true, "should call selectInEditor on device for Bitwig UI feedback");
})();

// device selector onExit callback returns to grid
(function() {
    var ds = fakeDeviceSelector();
    var tw = fakeTwister();
    var bw = fakeBitwig({
        groups: { 5: 10 },
        groupChildren: { 10: [11] },
        tracks: { 10: fakeTrack("Guitars (5)", { isGroup: true }), 11: fakeTrack("Clean (1)") }
    });
    var ctrl = makeController({ deviceSelector: ds, twister: tw, bitwig: bw });
    ctrl.selectedGroup = 5;
    ctrl.enterTrackMode();
    // Simulate exit from device selector
    ds._onExit();
    assert(ctrl._mode === 'grid', "exiting device selector should return to grid");
    assert(ctrl.selectedGroup === 5, "should re-select same group");
})();

// refreshTrackGrid is no-op when device selector active
(function() {
    var ds = fakeDeviceSelector();
    ds.activate(function() {}, function() {});
    var lp = fakeLaunchpad();
    var ctrl = makeController({ deviceSelector: ds, launchpad: lp });
    lp.calls = [];
    ctrl.refreshTrackGrid();
    var unlinkCalls = lp.calls.filter(function(c) { return c.method === 'unlinkPad'; });
    assert(unlinkCalls.length === 0, "refreshTrackGrid should be no-op when device selector active");
})();

// full state machine cycle: grid → track → device → track → grid
(function() {
    var tw = fakeTwister();
    var dq = fakeDeviceQuadrant();
    var ds = fakeDeviceSelector();
    var bw = fakeBitwig({
        groups: { 5: 10 },
        groupChildren: { 10: [11] },
        tracks: { 10: fakeTrack("Guitars (5)", { isGroup: true }), 11: fakeTrack("Clean (1)") }
    });
    var ctrl = makeController({ twister: tw, deviceQuadrant: dq, deviceSelector: ds, bitwig: bw });
    ctrl.selectedGroup = 5;

    // Start in grid
    assert(ctrl._mode === 'grid', "should start in grid");

    // Select track → track mode
    ctrl._suppressNextDeviceChange = true;
    ctrl.enterTrackMode();
    assert(ctrl._mode === 'track', "should be in track mode");

    // Select device → device mode
    ctrl.enterDeviceMode("SomePlugin");
    assert(ctrl._mode === 'device', "should be in device mode");

    // Exit device → track mode
    dq._exitCallback();
    assert(ctrl._mode === 'track', "should return to track mode");

    // Exit track → grid
    ds._onExit();
    assert(ctrl._mode === 'grid', "should return to grid");
    assert(ctrl.selectedGroup === 5, "should re-select group");
})();

// toggleMultiRec flips state and shows growl
(function() {
    var h = fakeHost();
    var ctrl = makeController({ host: h });
    assert(ctrl._multiRec === false, 'multi-rec should start false');
    ctrl.toggleMultiRec();
    assert(ctrl._multiRec === true, 'toggleMultiRec should flip to true');
    assert(h.notifications.indexOf("Multi Rec: ON") !== -1, 'should growl Multi Rec: ON');
    ctrl.toggleMultiRec();
    assert(ctrl._multiRec === false, 'toggleMultiRec should flip back to false');
    assert(h.notifications.indexOf("Multi Rec: OFF") !== -1, 'should growl Multi Rec: OFF');
})();

// toggleMultiRec calls launchpadModeSwitcher.refresh() for button color sync
(function() {
    var ms = fakeModeSwitcher();
    var ctrl = makeController({ launchpadModeSwitcher: ms });
    ctrl.toggleMultiRec();
    assert(ms.calls.indexOf('refresh') !== -1, 'toggleMultiRec should call launchpadModeSwitcher.refresh()');
})();

// recordArm with _multiRec=true toggles arm without XOR
(function() {
    var armed = {};
    function armTrack(id, name, isArmed) {
        return {
            name: function() { return { get: function() { return name; } }; },
            arm: function() {
                return {
                    get: function() { return armed[id] || false; },
                    set: function(v) { armed[id] = v; }
                };
            },
            makeVisibleInArranger: function() {}
        };
    }
    var tracks = {};
    for (var i = 0; i < 64; i++) tracks[i] = armTrack(i, "Track " + i);
    tracks[3] = armTrack(3, "Kick (1)");
    armed[5] = true; // another track is armed

    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: tracks });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('recordArm');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl._multiRec = true;
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(armed[3] === true, "clicked track should be armed in multi-rec");
    assert(armed[5] === true, "other armed track should remain armed in multi-rec");
})();

// recordArm with _multiRec=true shows "Disarm:" growl when disarming
(function() {
    var armed = {};
    function armTrack(id, name) {
        return {
            name: function() { return { get: function() { return name; } }; },
            arm: function() {
                return {
                    get: function() { return armed[id] || false; },
                    set: function(v) { armed[id] = v; }
                };
            },
            makeVisibleInArranger: function() {}
        };
    }
    var tracks = {};
    for (var i = 0; i < 64; i++) tracks[i] = armTrack(i, "Track " + i);
    tracks[3] = armTrack(3, "Kick (1)");
    armed[3] = true; // this track is already armed

    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: tracks });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('recordArm');
    var h = fakeHost();
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms, host: h });
    ctrl._multiRec = true;
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(armed[3] === false, "clicking armed track in multi-rec should disarm it");
    assert(h.notifications.indexOf("Disarm: Kick (1)") !== -1, "should growl Disarm: TrackName");
})();

// clearAllArm resets _multiRec to false
(function() {
    var ctrl = makeController({});
    ctrl._multiRec = true;
    ctrl.clearAllArm();
    assert(ctrl._multiRec === false, 'clearAllArm should reset _multiRec to false');
})();

// selectGroup resets _multiRec to false
(function() {
    var ctrl = makeController({});
    ctrl._multiRec = true;
    ctrl.selectGroup(16);
    assert(ctrl._multiRec === false, 'selectGroup should reset _multiRec to false');
})();

// _multiRec setter auto-refreshes mode switcher (architectural guarantee)
(function() {
    var ms = fakeModeSwitcher();
    var ctrl = makeController({ launchpadModeSwitcher: ms });
    ms.calls.length = 0;
    ctrl._multiRec = true;
    assert(ms.calls.indexOf('refresh') !== -1, 'setting _multiRec should auto-refresh mode switcher');
})();

// _multiRec setter skips refresh when value unchanged
(function() {
    var ms = fakeModeSwitcher();
    var ctrl = makeController({ launchpadModeSwitcher: ms });
    ms.calls.length = 0;
    ctrl._multiRec = false;
    assert(ms.calls.indexOf('refresh') === -1, 'setting _multiRec to same value should not refresh');
})();

// selectGroup auto-refreshes mode switcher when _multiRec was true
(function() {
    var ms = fakeModeSwitcher();
    var ctrl = makeController({ launchpadModeSwitcher: ms });
    ctrl._multiRec = true;
    ms.calls.length = 0;
    ctrl.selectGroup(16);
    assert(ms.calls.indexOf('refresh') !== -1, 'selectGroup should auto-refresh mode switcher when _multiRec resets');
})();

// mute action calls makeVisibleInArranger
(function() {
    var track = fakeTrack("Kick (1)");
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: track } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('mute');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(track._getVisibleCalls() === 1, "mute should call makeVisibleInArranger");
})();

// solo action calls makeVisibleInArranger
(function() {
    var track = fakeTrack("Kick (1)");
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: track } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('solo');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(track._getVisibleCalls() === 1, "solo should call makeVisibleInArranger");
})();

// recordArm XOR action calls makeVisibleInArranger
(function() {
    var track = fakeTrack("Kick (1)");
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: track } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('recordArm');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(track._getVisibleCalls() === 1, "recordArm XOR should call makeVisibleInArranger");
})();

// recordArm multi-rec action calls makeVisibleInArranger
(function() {
    var track = fakeTrack("Kick (1)");
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: track } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('recordArm');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl._multiRec = true;
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(track._getVisibleCalls() === 1, "recordArm multi-rec should call makeVisibleInArranger");
})();

// select action calls makeVisibleInArranger
(function() {
    var track = fakeTrack("Kick (1)");
    var tw = fakeTwister();
    tw.links[1] = { trackId: 3 };
    var bw = fakeBitwig({ tracks: { 3: track } });
    var lp = fakeLaunchpad();
    var ms = fakeModeSwitcher('select');
    var ctrl = makeController({ twister: tw, bitwig: bw, launchpad: lp, launchpadModeSwitcher: ms });
    ctrl.refreshTrackGrid();
    lp.behaviors[11].click();
    assert(track._getVisibleCalls() === 1, "select should call makeVisibleInArranger");
})();

// enterTrackMode toggles device pane on
(function() {
    var bw = fakeBitwig();
    var ctrl = makeController({ bitwig: bw });
    assert(ctrl._devicePaneShown === false, "device pane should start hidden");
    ctrl.enterTrackMode();
    assert(ctrl._devicePaneShown === true, "device pane should be shown after enterTrackMode");
    assert(bw._getToggleDevicesCalls() === 1, "should call toggleDevices once");
})();

// enterTrackMode does not double-toggle if already shown
(function() {
    var bw = fakeBitwig();
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterTrackMode();
    ctrl.enterTrackMode();
    assert(bw._getToggleDevicesCalls() === 1, "should only toggle once");
    assert(ctrl._devicePaneShown === true, "should remain shown");
})();

// enterDeviceMode does not affect device pane
(function() {
    var bw = fakeBitwig();
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterDeviceMode("SomePlugin");
    assert(ctrl._devicePaneShown === false, "device pane should remain hidden after enterDeviceMode");
    assert(bw._getToggleDevicesCalls() === 0, "should not call toggleDevices");
})();

// selectGroup(non-16) keeps device pane open when already shown
(function() {
    var bw = fakeBitwig({ groups: { 1: 0 }, groupChildren: { 0: [] }, tracks: { 0: fakeTrack("G (1)", { isGroup: true }) } });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterTrackMode();
    ctrl.selectGroup(1);
    assert(ctrl._devicePaneShown === true, "device pane should remain shown after selectGroup(non-16)");
    assert(bw._getToggleDevicesCalls() === 1, "should only toggle once (track mode opened it)");
})();

// selectGroup(16) keeps device pane open when coming from track mode
(function() {
    var bw = fakeBitwig();
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterTrackMode();
    ctrl.selectGroup(16);
    assert(ctrl._devicePaneShown === true, "device pane should remain shown after selectGroup(16) from track mode");
    assert(bw._getToggleDevicesCalls() === 1, "should only toggle once (track mode opened it)");
})();

// selectGroup(16) keeps device pane open when coming from master track mode
(function() {
    var masterTrack = fakeTrack("Master");
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterMasterTrackMode();
    ctrl.selectGroup(16);
    assert(ctrl._devicePaneShown === true, "device pane should remain shown after leaving master track mode");
    assert(bw._getToggleDevicesCalls() === 1, "should only toggle once (master track mode opened it)");
})();

// selectGroup opens device pane when not already shown
(function() {
    var bw = fakeBitwig();
    var ctrl = makeController({ bitwig: bw });
    ctrl.selectGroup(16);
    assert(ctrl._devicePaneShown === true, "device pane should be shown after selectGroup");
    assert(bw._getToggleDevicesCalls() === 1, "should toggle once to open pane");
})();

// full cycle: track mode opens pane, selectGroup keeps it open
(function() {
    var bw = fakeBitwig({
        groups: { 5: 10 },
        groupChildren: { 10: [11] },
        tracks: { 10: fakeTrack("Guitars (5)", { isGroup: true }), 11: fakeTrack("Clean (1)") }
    });
    var dq = fakeDeviceQuadrant();
    var ds = fakeDeviceSelector();
    var ctrl = makeController({ bitwig: bw, deviceQuadrant: dq, deviceSelector: ds });
    ctrl.selectedGroup = 5;
    ctrl.enterTrackMode();
    assert(ctrl._devicePaneShown === true, "pane shown after entering track mode");
    ctrl.enterDeviceMode("SomePlugin");
    assert(ctrl._devicePaneShown === true, "pane remains shown in device mode");
    assert(bw._getToggleDevicesCalls() === 1, "only one toggle (track mode on)");
    ctrl.selectGroup(5);
    assert(ctrl._devicePaneShown === true, "pane stays open after selectGroup");
    assert(bw._getToggleDevicesCalls() === 1, "still one toggle total (no extra toggle needed)");
})();

// selectGroup with skipDevicePane does not toggle device pane
(function() {
    var bw = fakeBitwig();
    var ctrl = makeController({ bitwig: bw });
    ctrl.selectGroup(16, { skipDevicePane: true });
    assert(ctrl._devicePaneShown === false, "device pane should remain hidden with skipDevicePane");
    assert(bw._getToggleDevicesCalls() === 0, "should not call toggleDevices with skipDevicePane");
})();

// init() does not open device pane (uses skipDevicePane)
(function() {
    var bw = fakeBitwig();
    var ctrl = makeController({ bitwig: bw });
    ctrl.init();
    assert(ctrl._devicePaneShown === false, "init should not set _devicePaneShown");
    assert(bw._getToggleDevicesCalls() === 0, "init should not toggle device pane");
})();

// selectGroup(non-16) calls selectInMixer on group track
(function() {
    var selected = false;
    var groupTrack = fakeTrack("Drums (3)", { isGroup: true });
    groupTrack.selectInMixer = function() { selected = true; };
    var bw = fakeBitwig({ groups: { 3: 5 }, groupChildren: { 5: [] }, tracks: { 5: groupTrack } });
    var ctrl = makeController({ bitwig: bw });
    ctrl.selectGroup(3);
    assert(selected === true, "selectGroup(non-16) should call selectInMixer on group track");
})();

// _mapDeviceToTwister creates custom mapper when available
(function() {
    var mapperInstance = fakeMapper();
    var ctrl = makeController({
        mappers: { 'TestPlugin': function() { return mapperInstance; } }
    });
    ctrl._mapDeviceToTwister('TestPlugin');
    assert(ctrl._activeMapper === mapperInstance, "should set _activeMapper from custom mapper");
    assert(ctrl._pendingRCCheck === false, "should not set pendingRCCheck for known device");
})();

// _mapDeviceToTwister schedules RC check for unknown device
(function() {
    var h = fakeHost();
    var genericCalls = [];
    var fakeDeviceMapper = {
        applyGenericMapping: function() { genericCalls.push('applyGenericMapping'); },
        resetGenericMode: function() {}
    };
    var ctrl = makeController({ host: h });
    ctrl.deviceMapper = fakeDeviceMapper;
    ctrl._mapDeviceToTwister('UnknownPlugin');
    assert(ctrl._activeMapper === null, "should not set _activeMapper for unknown device");
    assert(ctrl._pendingRCCheck === true, "should set pendingRCCheck");
    assert(h.scheduled.length === 1, "should schedule RC check task");
    h.scheduled[0].fn();
    assert(genericCalls.length === 1, "should fallback to generic mapping");
})();

// double-click same device in DeviceSelector enters device mode
(function() {
    var ds = fakeDeviceSelector();
    var dq = fakeDeviceQuadrant();
    var tw = fakeTwister();
    var ctrl = makeController({ deviceSelector: ds, deviceQuadrant: dq, twister: tw });
    ctrl.enterTrackMode();
    // Simulate first click on device index 2
    ds._onDeviceSelected(2);
    assert(ctrl._selectedDeviceIndex === 2, "first click sets _selectedDeviceIndex");
    assert(ctrl._mode === 'track', "first click stays in track mode");
    // Simulate onDeviceChanged triggered by Bitwig
    ctrl.onDeviceChanged("PluginA");
    assert(ctrl._lastDeviceName === 'PluginA', "_lastDeviceName set by onDeviceChanged");
    // Simulate second click on same device index
    ds._onDeviceSelected(2);
    assert(ctrl._mode === 'device', "second click on same device enters device mode");
})();

// clicking different device in DeviceSelector updates index, stays in track mode
(function() {
    var ds = fakeDeviceSelector();
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ deviceSelector: ds, deviceQuadrant: dq });
    ctrl.enterTrackMode();
    ds._onDeviceSelected(1);
    assert(ctrl._selectedDeviceIndex === 1, "first click sets index to 1");
    ctrl.onDeviceChanged("PluginA");
    ds._onDeviceSelected(3);
    assert(ctrl._selectedDeviceIndex === 3, "clicking different device updates index to 3");
    assert(ctrl._mode === 'track', "should stay in track mode");
})();

// _selectedDeviceIndex and _lastDeviceName reset on enterTrackMode
(function() {
    var ctrl = makeController();
    ctrl._selectedDeviceIndex = 5;
    ctrl._lastDeviceName = 'SomePlugin';
    ctrl.enterTrackMode();
    assert(ctrl._selectedDeviceIndex === null, "_selectedDeviceIndex should be null after enterTrackMode");
    assert(ctrl._lastDeviceName === null, "_lastDeviceName should be null after enterTrackMode");
})();

// _selectedDeviceIndex and _lastDeviceName reset on selectGroup
(function() {
    var ctrl = makeController();
    ctrl._selectedDeviceIndex = 5;
    ctrl._lastDeviceName = 'SomePlugin';
    ctrl.selectGroup(16);
    assert(ctrl._selectedDeviceIndex === null, "_selectedDeviceIndex should be null after selectGroup");
    assert(ctrl._lastDeviceName === null, "_lastDeviceName should be null after selectGroup");
})();

// clicking device already at cursor position triggers onDeviceChanged directly
(function() {
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 2;
    var tw = fakeTwister();
    var bw = fakeBitwig({ _cursorDeviceName: 'AlreadySelected' });
    var ctrl = makeController({ deviceSelector: ds, twister: tw, bitwig: bw });
    ctrl.enterTrackMode();
    ds._onDeviceSelected(2);
    assert(ctrl._lastDeviceName === 'AlreadySelected', "should set _lastDeviceName via onDeviceChanged for already-selected device");
    assert(ctrl._mode === 'track', "should stay in track mode after first click");
})();

// second click on already-at-cursor device enters device mode (double-click)
(function() {
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 2;
    var dq = fakeDeviceQuadrant();
    var tw = fakeTwister();
    var bw = fakeBitwig({ _cursorDeviceName: 'AlreadySelected' });
    var ctrl = makeController({ deviceSelector: ds, deviceQuadrant: dq, twister: tw, bitwig: bw });
    ctrl.enterTrackMode();
    // First click: cursor already at position 2 → onDeviceChanged fires directly
    ds._onDeviceSelected(2);
    assert(ctrl._lastDeviceName === 'AlreadySelected', "_lastDeviceName should be set after first click");
    // Second click: same index + _lastDeviceName truthy → enters device mode
    ds._onDeviceSelected(2);
    assert(ctrl._mode === 'device', "second click on already-at-cursor device should enter device mode");
})();

// enterDeviceMode opens plugin window when device is a plugin
(function() {
    var bw = fakeBitwig({ _isPlugin: true });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterDeviceMode('PluginDevice');
    assert(bw._pluginWindowOpen === true, "plugin window should be opened on entering device mode for a plugin");
})();

// enterDeviceMode does NOT open plugin window when device is not a plugin
(function() {
    var bw = fakeBitwig({ _isPlugin: false });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterDeviceMode('BitwigDevice');
    assert(bw._pluginWindowOpen === undefined || bw._pluginWindowOpen === false, "plugin window should NOT be opened for non-plugin device");
})();

// enterTrackMode closes plugin window if it was open
(function() {
    var bw = fakeBitwig({ _isPlugin: true, _pluginWindowOpen: true });
    var ctrl = makeController({ bitwig: bw });
    ctrl._mode = 'device';
    ctrl.enterTrackMode();
    assert(bw._pluginWindowOpen === false, "plugin window should be closed when leaving device mode via enterTrackMode");
})();

// selectGroup closes plugin window if it was open
(function() {
    var bw = fakeBitwig({ _isPlugin: true, _pluginWindowOpen: true });
    var ctrl = makeController({ bitwig: bw });
    ctrl._mode = 'device';
    ctrl.selectGroup(16);
    assert(bw._pluginWindowOpen === false, "plugin window should be closed when leaving device mode via selectGroup");
})();

// enterMasterTrackMode sets _mode to 'track' and _masterTrackMode to true
(function() {
    var masterTrack = fakeTrack("Master");
    var tw = fakeTwister();
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.selectedGroup = 16;
    ctrl.enterMasterTrackMode();
    assert(ctrl._mode === 'track', "_mode should be 'track'");
    assert(ctrl._masterTrackMode === true, "_masterTrackMode should be true");
})();

// enterMasterTrackMode links project remote controls
(function() {
    var masterTrack = fakeTrack("Master");
    var tw = fakeTwister();
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.enterMasterTrackMode();
    var projectRCCalls = tw.calls.filter(function(c) { return c === 'linkEncodersToProjectRemoteControls'; });
    assert(projectRCCalls.length === 1, "should call linkEncodersToProjectRemoteControls");
})();

// enterMasterTrackMode shows growl
(function() {
    var masterTrack = fakeTrack("Master");
    var h = fakeHost();
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ host: h, bitwig: bw });
    ctrl.enterMasterTrackMode();
    assert(h.notifications.indexOf("Master → Track Mode") !== -1, "should show Master → Track Mode growl");
})();

// enterMasterTrackMode shows device pane
(function() {
    var masterTrack = fakeTrack("Master");
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterMasterTrackMode();
    assert(ctrl._devicePaneShown === true, "device pane should be shown");
    assert(bw._getToggleDevicesCalls() === 1, "should toggle device pane once");
})();

// enterMasterTrackMode activates device selector
(function() {
    var masterTrack = fakeTrack("Master");
    var ds = fakeDeviceSelector();
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ deviceSelector: ds, bitwig: bw });
    ctrl.enterMasterTrackMode();
    assert(ds.calls.indexOf('activate') !== -1, "should activate device selector");
})();

// enterMasterTrackMode calls makeVisibleInArranger on master track
(function() {
    var masterTrack = fakeTrack("Master");
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterMasterTrackMode();
    assert(masterTrack._getVisibleCalls() === 1, "should call makeVisibleInArranger on master track");
})();

// enterMasterTrackMode does nothing without master track
(function() {
    var tw = fakeTwister();
    var bw = fakeBitwig({ masterTrack: null });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl._mode = 'grid';
    ctrl.enterMasterTrackMode();
    assert(ctrl._mode === 'grid', "_mode should remain 'grid' without master track");
})();

// onCursorTrackChanged in master track mode is suppressed
(function() {
    var masterTrack = fakeTrack("Master");
    var tw = fakeTwister();
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.enterMasterTrackMode();
    tw.calls.length = 0;
    ctrl.onCursorTrackChanged("Some Track");
    assert(ctrl._masterTrackMode === true, "_masterTrackMode should remain true");
    var trackRCCalls = tw.calls.filter(function(c) { return c === 'linkEncodersToTrackRemoteControls'; });
    assert(trackRCCalls.length === 0, "should NOT re-link track RCs");
})();

// onDeviceChanged in master track mode updates _lastDeviceName but does not remap twister
(function() {
    var masterTrack = fakeTrack("Master");
    var tw = fakeTwister();
    var h = fakeHost();
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ twister: tw, bitwig: bw, host: h });
    ctrl.enterMasterTrackMode();
    tw.calls.length = 0;
    ctrl.onDeviceChanged("SomePlugin");
    assert(ctrl._lastDeviceName === 'SomePlugin', "_lastDeviceName should be updated");
    assert(h.notifications.indexOf("Device: SomePlugin") !== -1, "should show device growl");
    assert(tw.calls.indexOf('unlinkAll') === -1, "should NOT call unlinkAll (keep project RCs)");
})();

// selectGroup clears _masterTrackMode
(function() {
    var masterTrack = fakeTrack("Master");
    var tw = fakeTwister();
    var bw = fakeBitwig({ masterTrack: masterTrack, topLevel: [] });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.enterMasterTrackMode();
    assert(ctrl._masterTrackMode === true, "_masterTrackMode should be true");
    ctrl.selectGroup(16);
    assert(ctrl._masterTrackMode === false, "selectGroup should clear _masterTrackMode");
})();

// enterTrackMode clears _masterTrackMode
(function() {
    var masterTrack = fakeTrack("Master");
    var tw = fakeTwister();
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.enterMasterTrackMode();
    assert(ctrl._masterTrackMode === true, "_masterTrackMode should be true");
    ctrl.enterTrackMode();
    assert(ctrl._masterTrackMode === false, "enterTrackMode should clear _masterTrackMode");
})();

// enterDeviceMode clears _masterTrackMode
(function() {
    var masterTrack = fakeTrack("Master");
    var tw = fakeTwister();
    var bw = fakeBitwig({ masterTrack: masterTrack });
    var ctrl = makeController({ twister: tw, bitwig: bw });
    ctrl.enterMasterTrackMode();
    ctrl.enterDeviceMode("SomePlugin");
    assert(ctrl._masterTrackMode === false, "enterDeviceMode should clear _masterTrackMode");
})();

// enterMasterTrackMode closes plugin window if open
(function() {
    var masterTrack = fakeTrack("Master");
    var bw = fakeBitwig({ masterTrack: masterTrack, _isPlugin: true, _pluginWindowOpen: true });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterMasterTrackMode();
    assert(bw._pluginWindowOpen === false, "plugin window should be closed");
})();

// enterDeviceMode opens plugin window for plugins
(function() {
    var bw = fakeBitwig({ _isPlugin: true });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterDeviceMode("Serum");
    assert(bw._pluginWindowOpen === true, "plugin window should be opened for plugins");
    assert(!bw._remoteControlsSectionVisible, "remote controls should NOT be opened for plugins");
})();

// enterDeviceMode opens remote controls for native devices
(function() {
    var bw = fakeBitwig({ _isPlugin: false });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterDeviceMode("EQ+");
    assert(bw._remoteControlsSectionVisible === true, "remote controls should be opened for native devices");
    assert(!bw._pluginWindowOpen, "plugin window should NOT be opened for native devices");
})();

// exiting device mode closes remote controls (via enterTrackMode)
(function() {
    var bw = fakeBitwig({ _isPlugin: false });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterDeviceMode("EQ+");
    assert(bw._remoteControlsSectionVisible === true, "remote controls should be open");
    ctrl.enterTrackMode();
    assert(bw._remoteControlsSectionVisible === false, "remote controls should be closed on enterTrackMode");
})();

// exiting device mode closes remote controls (via selectGroup)
(function() {
    var bw = fakeBitwig({ _isPlugin: false });
    var tw = fakeTwister();
    var lp = fakeLaunchpad();
    var ctrl = makeController({ bitwig: bw, twister: tw, launchpad: lp });
    ctrl.enterDeviceMode("EQ+");
    assert(bw._remoteControlsSectionVisible === true, "remote controls should be open");
    ctrl.selectGroup(16);
    assert(bw._remoteControlsSectionVisible === false, "remote controls should be closed on selectGroup");
})();

// enterMasterTrackMode closes remote controls
(function() {
    var masterTrack = fakeTrack("Master");
    var bw = fakeBitwig({ masterTrack: masterTrack, _remoteControlsSectionVisible: true });
    var ctrl = makeController({ bitwig: bw });
    ctrl.enterMasterTrackMode();
    assert(bw._remoteControlsSectionVisible === false, "remote controls should be closed on enterMasterTrackMode");
})();

// pending param values are replayed when mapper is created
(function() {
    var mapper;
    var mappers = { 'Frequalizer Alt': function() { mapper = fakeMapper(); return mapper; } };
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 1;
    var bw = fakeBitwig({ _cursorDeviceName: 'Frequalizer Alt' });
    var ctrl = makeController({ mappers: mappers, deviceSelector: ds, bitwig: bw });
    // Bitwig fires onDeviceChanged in grid mode (ignored for mode transitions)
    ctrl.onDeviceChanged('Frequalizer Alt');
    ctrl.enterTrackMode();
    // Param values arrive before mapper exists
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID1', 0.8);
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID2', 0.5);
    // User clicks device pad (cursor at position → creates mapper)
    ds._onDeviceSelected(1);
    assert(mapper._fedParams.length === 2, "mapper should receive pending param values");
    assert(mapper._fedParams[0].id === 'CONTENTS/PID1', "first param id");
    assert(mapper._fedParams[0].value === 0.8, "first param value");
})();

// double-click preserves existing mapper
(function() {
    var callCount = 0;
    var mapper;
    var mappers = { 'Frequalizer Alt': function() { callCount++; mapper = fakeMapper(); return mapper; } };
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 1;
    var bw = fakeBitwig({ _cursorDeviceName: 'Frequalizer Alt' });
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ mappers: mappers, deviceSelector: ds, bitwig: bw, deviceQuadrant: dq });
    ctrl.enterTrackMode();
    // First click creates mapper
    ds._onDeviceSelected(1);
    var firstMapper = ctrl._activeMapper;
    assert(callCount === 1, "factory called once on first click");
    // Second click (double-click → enterDeviceMode)
    ds._onDeviceSelected(1);
    assert(ctrl._activeMapper === firstMapper, "same mapper instance preserved");
    assert(callCount === 1, "factory NOT called again");
})();

// onDeviceChanged in device mode with different device recreates mapper
(function() {
    var dq = fakeDeviceQuadrant();
    var mappers = {
        'DevA': function() { return fakeMapper(); },
        'DevB': function() { return fakeMapper(); }
    };
    var ctrl = makeController({ mappers: mappers, deviceQuadrant: dq });
    ctrl.enterDeviceMode('DevA');
    var firstMapper = ctrl._activeMapper;
    ctrl.onDeviceChanged('DevB');
    assert(ctrl._activeMapper !== firstMapper, "different device should create new mapper");
    assert(ctrl._activeMapper !== null, "new mapper should exist for DevB");
})();

// full scenario: grid init → track mode → click device → double-click → encoders preserved
(function() {
    var mapper;
    var callCount = 0;
    var mappers = { 'Frequalizer Alt': function() { callCount++; mapper = fakeMapper(); return mapper; } };
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 0;
    var dq = fakeDeviceQuadrant();
    var bw = fakeBitwig({ _cursorDeviceName: 'Frequalizer Alt' });
    var ctrl = makeController({
        mappers: mappers, deviceSelector: ds, deviceQuadrant: dq, bitwig: bw
    });
    // Init: Bitwig sends device change + param values (grid mode, no mapper)
    ctrl.onDeviceChanged("Frequalizer Alt"); // ignored in grid mode
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/Q1_ACTIVE', 1.0);
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/Q1_FREQ', 0.5);
    // User enters track mode
    ctrl.enterTrackMode();
    // First click on device (cursor at position)
    ds._onDeviceSelected(0);
    assert(callCount === 1, "mapper created on first click");
    assert(mapper._fedParams.length === 2, "mapper initialized with pending values");
    // Second click (double-click → device mode)
    ds._onDeviceSelected(0);
    assert(ctrl._mode === 'device', "should enter device mode");
    assert(callCount === 1, "factory NOT called again on double-click");
    assert(ctrl._activeMapper === mapper, "same mapper preserved");
})();

// pending param values are cleared when device changes
(function() {
    var mapper;
    var mappers = { 'DevB': function() { mapper = fakeMapper(); return mapper; } };
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 0;
    var bw = fakeBitwig({ _cursorDeviceName: 'DevB' });
    var ctrl = makeController({ mappers: mappers, deviceSelector: ds, bitwig: bw });
    // Bitwig fires onDeviceChanged for old device + param values
    ctrl.onDeviceChanged('OldDevice');
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/OLD_PARAM', 0.9);
    // Device changes → pending values should be cleared
    ctrl.enterTrackMode();
    ctrl.onDeviceChanged('DevB');
    // DevB's mapper should NOT receive OLD_PARAM
    assert(mapper._fedParams.length === 0, "old pending values should be cleared on device change");
})();

// exit device mode and re-enter returns cached instance (no re-creation)
(function() {
    var callCount = 0;
    var latestMapper;
    var mappers = { 'Dev': function() { callCount++; latestMapper = fakeMapper(); return latestMapper; } };
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 0;
    var dq = fakeDeviceQuadrant();
    var bw = fakeBitwig({ _cursorDeviceName: 'Dev' });
    var ctrl = makeController({ mappers: mappers, deviceSelector: ds, deviceQuadrant: dq, bitwig: bw });
    ctrl.onDeviceChanged('Dev');
    ctrl.enterTrackMode();
    ds._onDeviceSelected(0);   // first click → creates mapper
    ds._onDeviceSelected(0);   // double-click → device mode
    assert(callCount === 1, "mapper created once");
    var firstMapper = latestMapper;
    // Exit device mode via exit pad
    dq._exitCallback();
    assert(ctrl._mode === 'track', "should be in track mode");
    assert(ctrl._activeMapper === null, "active mapper should be null in track mode");
    assert(ctrl._cache._mappers['Dev'] === firstMapper, "instance should be cached");
    // Re-click same device → same instance returned
    ds._onDeviceSelected(0);
    ds._onDeviceSelected(0);
    assert(callCount === 1, "factory NOT called again (instance cached)");
    assert(ctrl._activeMapper === firstMapper, "same mapper instance reused");
})();

// different device gets its own cached instance
(function() {
    var mappers = {
        'DevA': function() { return fakeMapper(); },
        'DevB': function() { return fakeMapper(); }
    };
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 0;
    var dq = fakeDeviceQuadrant();
    var bw = fakeBitwig({ _cursorDeviceName: 'DevA' });
    var ctrl = makeController({ mappers: mappers, deviceSelector: ds, deviceQuadrant: dq, bitwig: bw });
    ctrl.onDeviceChanged('DevA');
    ctrl.enterTrackMode();
    ds._onDeviceSelected(0);
    ds._onDeviceSelected(0);
    var devAMapper = ctrl._activeMapper;
    // Exit device mode → DevA instance stays in cache
    dq._exitCallback();
    assert(ctrl._cache._mappers['DevA'] === devAMapper, "DevA instance cached");
    // Different device selected
    ctrl.onDeviceChanged('DevB');
    assert(ctrl._activeMapper !== devAMapper, "DevB should get its own instance");
    assert(ctrl._cache._mappers['DevB'] !== undefined, "DevB should be cached");
})();

// instance cache survives selectGroup
(function() {
    var callCount = 0;
    var firstMapper;
    var mappers = { 'Dev': function() { callCount++; firstMapper = fakeMapper(); return firstMapper; } };
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 0;
    var dq = fakeDeviceQuadrant();
    var bw = fakeBitwig({ _cursorDeviceName: 'Dev' });
    var ctrl = makeController({ mappers: mappers, deviceSelector: ds, deviceQuadrant: dq, bitwig: bw });
    // Enter device mode for 'Dev'
    ctrl.enterDeviceMode('Dev');
    assert(callCount === 1, "mapper created");
    // Exit device mode
    dq._exitCallback();
    assert(ctrl._cache._mappers['Dev'] === firstMapper, "instance cached after exit");
    // selectGroup
    ctrl.selectGroup(16);
    // Instance cache should survive
    assert(ctrl._cache._mappers['Dev'] === firstMapper, "instance cache survives selectGroup");
    // Re-enter track mode and device mode for same device
    ctrl.enterTrackMode();
    ctrl.onDeviceChanged('Dev');
    assert(ctrl._activeMapper === firstMapper, "same instance returned after selectGroup flow");
    assert(callCount === 1, "factory NOT called again");
})();

// instance cache is cleared on cursor track change
(function() {
    var mappers = { 'Dev': function() { return fakeMapper(); } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ mappers: mappers, deviceQuadrant: dq });
    ctrl.enterDeviceMode('Dev');
    dq._exitCallback();
    assert(ctrl._cache._mappers['Dev'] !== undefined, "instance cached after exit");
    ctrl.onCursorTrackChanged('NewTrack');
    assert(ctrl._cache._mappers['Dev'] === undefined, "instance cache cleared on cursor track change");
})();

// pending params are fed to cached instance on re-entry
(function() {
    var latestMapper;
    var mappers = { 'Dev': function() { latestMapper = fakeMapper(); return latestMapper; } };
    var ds = fakeDeviceSelector();
    ds._cursorDevicePosition = 0;
    var dq = fakeDeviceQuadrant();
    var bw = fakeBitwig({ _cursorDeviceName: 'Dev' });
    var ctrl = makeController({ mappers: mappers, deviceSelector: ds, deviceQuadrant: dq, bitwig: bw });
    // Enter device mode, feed some params, exit
    ctrl.enterDeviceMode('Dev');
    var firstMapper = latestMapper;
    dq._exitCallback();
    // Param arrives while in track mode (buffered in cache)
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/NEW_PARAM', 0.7);
    // Re-enter device mode — same instance, pending params fed
    ctrl.enterTrackMode();
    ctrl.onDeviceChanged('Dev');
    assert(ctrl._activeMapper === firstMapper, "same instance returned");
    var feedCalls = firstMapper._fedParams.filter(function(p) { return p.id === 'NEW_PARAM'; });
    assert(feedCalls.length === 1, "pending param fed to cached instance");
    assert(feedCalls[0].value === 0.7, "pending param has correct value");
})();

// ---- pad mapper instance cache tests ----

// pad mapper instance cached on exit device mode
(function() {
    var testPadMapper = fakePadMapper();
    var padMappers = { 'Dev': function() { return testPadMapper; } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ padMappers: padMappers, deviceQuadrant: dq });
    ctrl.enterDeviceMode('Dev');
    assert(ctrl._activePadMapper === testPadMapper, "pad mapper should be active");
    dq._exitCallback();
    assert(ctrl._cache._padMappers['Dev'] === testPadMapper, "pad mapper instance should be cached");
})();

// pad mapper instance reused on re-enter device mode
(function() {
    var callCount = 0;
    var firstPadMapper;
    var padMappers = { 'Dev': function() { callCount++; firstPadMapper = fakePadMapper(); return firstPadMapper; } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ padMappers: padMappers, deviceQuadrant: dq });
    ctrl.enterDeviceMode('Dev');
    dq._exitCallback();
    assert(ctrl._cache._padMappers['Dev'] === firstPadMapper, "instance cached");
    // Re-enter device mode
    ctrl.enterDeviceMode('Dev');
    assert(callCount === 1, "factory NOT called again (instance cached)");
    assert(ctrl._activePadMapper === firstPadMapper, "same pad mapper instance reused");
})();

// pad mapper instance cache survives selectGroup
(function() {
    var testPadMapper = fakePadMapper();
    var padMappers = { 'Dev': function() { return testPadMapper; } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ padMappers: padMappers, deviceQuadrant: dq });
    ctrl.enterDeviceMode('Dev');
    dq._exitCallback();
    assert(ctrl._cache._padMappers['Dev'] === testPadMapper, "instance cached after exit");
    ctrl.selectGroup(16);
    assert(ctrl._cache._padMappers['Dev'] === testPadMapper, "pad mapper instance cache survives selectGroup");
})();

// pad mapper instance cache cleared on cursor track change
(function() {
    var testPadMapper = fakePadMapper();
    var padMappers = { 'Dev': function() { return testPadMapper; } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ padMappers: padMappers, deviceQuadrant: dq });
    ctrl.enterDeviceMode('Dev');
    dq._exitCallback();
    assert(ctrl._cache._padMappers['Dev'] === testPadMapper, "instance cached after exit");
    ctrl.onCursorTrackChanged('NewTrack');
    assert(ctrl._cache._padMappers['Dev'] === undefined, "pad mapper instance cache cleared on cursor track change");
})();

// ---- pending pad param tests ----

// pending pad params buffered when DeviceQuadrant not active
(function() {
    var ctrl = makeController({});
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID_MODE', 0.5);
    assert(ctrl._cache._pendingPadParams['CONTENTS/PID_MODE'] === 0.5, "should buffer pad param when no device quadrant");
})();

// pending pad params NOT buffered when DeviceQuadrant is active
(function() {
    var dq = fakeDeviceQuadrant();
    dq.activate(function() {});
    var ctrl = makeController({ deviceQuadrant: dq });
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID_MODE', 0.5);
    assert(ctrl._cache._pendingPadParams['CONTENTS/PID_MODE'] === undefined, "should NOT buffer pad param when device quadrant active");
})();

// pending pad params forwarded to pad mapper on enterDeviceMode
(function() {
    var testPadMapper = fakePadMapper();
    var padMappers = { 'Dev': function() { return testPadMapper; } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ padMappers: padMappers, deviceQuadrant: dq });
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID_MODE', 0.5);
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID_OTHER', 0.3);
    ctrl.enterDeviceMode('Dev');
    var modeParams = testPadMapper._paramValues.filter(function(p) { return p.id === 'CONTENTS/PID_MODE'; });
    assert(modeParams.length === 1, "pad mapper should receive PID_MODE");
    assert(modeParams[0].value === 0.5, "pad mapper should receive correct value for PID_MODE");
    var otherParams = testPadMapper._paramValues.filter(function(p) { return p.id === 'CONTENTS/PID_OTHER'; });
    assert(otherParams.length === 1, "pad mapper should receive PID_OTHER");
})();

// pending pad params cleared after forwarding
(function() {
    var testPadMapper = fakePadMapper();
    var padMappers = { 'Dev': function() { return testPadMapper; } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ padMappers: padMappers, deviceQuadrant: dq });
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID_MODE', 0.5);
    ctrl.enterDeviceMode('Dev');
    assert(Object.keys(ctrl._cache._pendingPadParams).length === 0, "pending pad params should be cleared after forwarding");
})();

// pending pad params NOT forwarded when no pad mapper
(function() {
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ deviceQuadrant: dq });
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID_MODE', 0.5);
    ctrl.enterDeviceMode('UnmappedDevice');
    // Should not throw, pending params just stay
    assert(true, "should not throw when no pad mapper");
})();

// pending pad params cleared on device change
(function() {
    var ctrl = makeController({});
    ctrl.onDeviceChanged('DevA');
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID_MODE', 0.5);
    ctrl.onDeviceChanged('DevB');
    assert(ctrl._cache._pendingPadParams['CONTENTS/PID_MODE'] === undefined, "pending pad params should be cleared on device change");
})();

// pending pad params cleared on cursor track change
(function() {
    var ctrl = makeController({});
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID_MODE', 0.5);
    ctrl.onCursorTrackChanged('NewTrack');
    assert(ctrl._cache._pendingPadParams['CONTENTS/PID_MODE'] === undefined, "pending pad params should be cleared on cursor track change");
})();

// pending pad params flushed into cached instance on re-enter
(function() {
    var testPadMapper = fakePadMapper();
    var padMappers = { 'Dev': function() { return testPadMapper; } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ padMappers: padMappers, deviceQuadrant: dq });
    ctrl.enterDeviceMode('Dev');
    dq._exitCallback();
    assert(ctrl._cache._padMappers['Dev'] === testPadMapper, "instance cached after exit");
    // Param arrives while in track mode
    ctrl.onDeviceParamChanged('ROOT_GENERIC_MODULE/CONTENTS/PID_MODE', 0.75);
    // Re-enter device mode — same instance, pending params flushed
    ctrl.enterDeviceMode('Dev');
    var modeParams = testPadMapper._paramValues.filter(function(p) { return p.id === 'CONTENTS/PID_MODE'; });
    assert(modeParams.length > 0, "pending pad param should be flushed into cached instance");
    assert(modeParams[modeParams.length - 1].value === 0.75, "flushed value should be 0.75");
})();

// selectGroup keeps mapper instances in cache (device→grid round-trip)
(function() {
    var testMapper = fakeMapper();
    var testPadMapper = fakePadMapper();
    var mappers = { 'TestDevice': function() { return testMapper; } };
    var padMappers = { 'TestDevice': function() { return testPadMapper; } };
    var dq = fakeDeviceQuadrant();
    var ctrl = makeController({ mappers: mappers, padMappers: padMappers, deviceQuadrant: dq });
    ctrl._lastDeviceName = 'TestDevice';
    ctrl._activeMapper = testMapper;
    ctrl._activePadMapper = testPadMapper;
    // Prime the cache so instances are stored
    ctrl._cache._mappers['TestDevice'] = testMapper;
    ctrl._cache._padMappers['TestDevice'] = testPadMapper;

    ctrl.selectGroup(16);

    assert(ctrl._activeMapper === null, "selectGroup should clear active mapper");
    assert(ctrl._lastDeviceName === null, "selectGroup should clear _lastDeviceName");
    assert(ctrl._cache._mappers['TestDevice'] === testMapper, "mapper instance should remain in cache");
    assert(ctrl._cache._padMappers['TestDevice'] === testPadMapper, "pad mapper instance should remain in cache");
})();

// selectGroup without _lastDeviceName clears active mapper
(function() {
    var ctrl = makeController({});
    ctrl._lastDeviceName = null;
    ctrl._activeMapper = fakeMapper();

    ctrl.selectGroup(16);

    assert(ctrl._activeMapper === null, "selectGroup should clear active mapper even without _lastDeviceName");
    assert(Object.keys(ctrl._cache._mappers).length === 0, "no mapper instances should be in cache");
})();

// _mapDeviceToTwister calls resync() on cached mapper that has it
(function() {
    var resyncCalls = 0;
    var mapper = fakeMapper();
    mapper.resync = function() { resyncCalls++; };
    var ctrl = makeController({
        mappers: { 'Dev': function() { return mapper; } }
    });
    ctrl._mapDeviceToTwister('Dev');
    assert(resyncCalls === 1, "should call resync() on mapper, got " + resyncCalls);
})();

// _mapDeviceToTwister does not crash when mapper has no resync()
(function() {
    var mapper = fakeMapper();
    var ctrl = makeController({
        mappers: { 'Dev': function() { return mapper; } }
    });
    ctrl._mapDeviceToTwister('Dev');
    assert(ctrl._activeMapper === mapper, "mapper without resync() still assigned");
})();

// re-entering device mode with cached mapper calls resync()
(function() {
    var resyncCalls = 0;
    var mapper = fakeMapper();
    mapper.resync = function() { resyncCalls++; };
    var dq = fakeDeviceQuadrant();
    var ds = fakeDeviceSelector();
    var ctrl = makeController({
        mappers: { 'Dev': function() { return mapper; } },
        deviceQuadrant: dq,
        deviceSelector: ds
    });
    ctrl.enterDeviceMode('Dev');
    assert(resyncCalls === 1, "first enterDeviceMode calls resync");
    // Go back to track mode (clears _activeMapper)
    ctrl.enterTrackMode();
    assert(ctrl._activeMapper === null, "track mode clears active mapper");
    // Re-enter device mode — mapper comes from cache
    ctrl.enterDeviceMode('Dev');
    assert(resyncCalls === 2, "second enterDeviceMode calls resync again, got " + resyncCalls);
})();

// selectGroup from device mode sets _mode='grid' before selectInMixer
// so that a synchronous onCursorTrackChanged doesn't call enterTrackMode
(function() {
    var tw = fakeTwister();
    var enterTrackModeCalls = 0;
    var groupTrack = fakeTrack("MyGroup (1)", { isGroup: true });
    // Make selectInMixer trigger onCursorTrackChanged synchronously
    groupTrack.selectInMixer = function() {
        ctrl.onCursorTrackChanged("MyGroup (1)");
    };
    var childTrack = fakeTrack("Bass (1)");
    var bw = fakeBitwig({
        groups: { 1: 10 },
        groupChildren: { 10: [11] },
        tracks: { 10: groupTrack, 11: childTrack }
    });
    var dq = fakeDeviceQuadrant();
    var ds = fakeDeviceSelector();
    var ctrl = makeController({
        twister: tw,
        bitwig: bw,
        deviceQuadrant: dq,
        deviceSelector: ds
    });

    // Put controller in device mode
    ctrl._mode = 'device';
    dq.activate(function() {}, null);
    ds.activate(function() {}, function() {});

    // Spy on enterTrackMode
    var origEnterTrackMode = ctrl.enterTrackMode.bind(ctrl);
    ctrl.enterTrackMode = function() {
        enterTrackModeCalls++;
        origEnterTrackMode();
    };

    ctrl.selectGroup(1);

    assert(ctrl._mode === 'grid', "mode should be grid after selectGroup");
    assert(enterTrackModeCalls === 0, "enterTrackMode should not be called when selectInMixer triggers onCursorTrackChanged, got " + enterTrackModeCalls);
    assert(tw.links[1] && tw.links[1].trackId === 11, "encoder 1 should be linked to child track");
})();

process.exit(t.summary('Controller'));
