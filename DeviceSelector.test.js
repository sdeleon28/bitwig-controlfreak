var DeviceSelectorHW = require('./DeviceSelector');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    var behaviors = {};
    var padColors = {};
    var padLinks = {};
    var calls = [];
    return {
        colors: { off: 0, green: 21, red: 5, yellow: 13, white: 3, blue: 45, cyan: 41, purple: 49 },
        brightness: { dim: 'dim', bright: 'bright' },
        calls: calls,
        behaviors: behaviors,
        padColors: padColors,
        padLinks: padLinks,
        unlinkPad: function(pad) { delete padLinks[pad]; calls.push({ method: 'unlinkPad', pad: pad }); },
        registerPadBehavior: function(pad, click, hold, page) { behaviors[pad] = { click: click, hold: hold, page: page }; },
        clearPadBehavior: function(pad) { delete behaviors[pad]; calls.push({ method: 'clearPadBehavior', pad: pad }); },
        getBrightnessVariant: function(baseColor, level) { return baseColor + '_' + level; },
        setPadColor: function(pad, color) { padColors[pad] = color; },
        clearPad: function(pad) { padColors[pad] = 0; }
    };
}

function fakeQuadrant() {
    return {
        bottomLeft: {
            pads: [11, 12, 13, 14, 21, 22, 23, 24, 31, 32, 33, 34, 41, 42, 43, 44]
        }
    };
}

function fakePager(activePage) {
    var paints = [];
    var clears = [];
    return {
        paints: paints,
        clears: clears,
        getActivePage: function() { return activePage || 1; },
        requestPaint: function(page, pad, color) { paints.push({ page: page, pad: pad, color: color }); },
        requestClear: function(page, pad) { clears.push({ page: page, pad: pad }); }
    };
}

function fakeBitwig(opts) {
    opts = opts || {};
    var _soloed = false;
    var _browseCalls = [];
    return {
        getCursorTrack: function() {
            return {
                solo: function() {
                    return {
                        get: function() { return _soloed; },
                        toggle: function() { _soloed = !_soloed; }
                    };
                }
            };
        },
        getCursorDevice: function() {
            return {
                selectDevice: function(device) { opts._selectedDevice = device; }
            };
        },
        getDeviceBank: function() { return opts.deviceBank || null; },
        getEndOfChainInsertionPoint: function() {
            return { browse: function() { _browseCalls.push(true); } };
        },
        _soloed: function() { return _soloed; },
        _browseCalls: _browseCalls
    };
}

function fakeDeviceBank(existsArray) {
    existsArray = existsArray || [];
    return {
        getItemAt: function(index) {
            return {
                exists: function() {
                    return { get: function() { return !!existsArray[index]; } };
                }
            };
        }
    };
}

function makeSubject(opts) {
    opts = opts || {};
    return new DeviceSelectorHW({
        launchpad: opts.launchpad || fakeLaunchpad(),
        launchpadQuadrant: opts.launchpadQuadrant || fakeQuadrant(),
        pager: opts.pager || fakePager(),
        bitwig: opts.bitwig || fakeBitwig(),
        pageNumber: opts.pageNumber || 1,
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// isActive returns false before activation
(function() {
    var ds = makeSubject();
    assert(ds.isActive() === false, 'should be inactive before activate()');
})();

// activate sets active state
(function() {
    var ds = makeSubject();
    ds.activate(function() {}, function() {});
    assert(ds.isActive() === true, 'should be active after activate()');
})();

// activate unlinks all 16 pads
(function() {
    var lp = fakeLaunchpad();
    var ds = makeSubject({ launchpad: lp });
    ds.activate();
    var unlinkCalls = lp.calls.filter(function(c) { return c.method === 'unlinkPad'; });
    assert(unlinkCalls.length === 16, 'should unlink all 16 pads');
})();

// activate paints first empty device pad dim green, rest dark (pads 1-12)
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var pads = fakeQuadrant().bottomLeft.pads;
    // First empty pad (index 0) should be dim green
    var firstPaint = pager.paints.filter(function(p) { return p.pad === pads[0]; });
    assert(firstPaint.length > 0 && firstPaint[firstPaint.length - 1].color === '21_dim',
        'first empty device pad should be dim green');
    // Rest should be dark
    for (var i = 1; i < 12; i++) {
        var found = pager.paints.some(function(p) { return p.pad === pads[i] && p.color === 0; });
        assert(found, 'empty device pad ' + (i + 1) + ' should be painted dark');
    }
})();

// activate paints existing device pads bright cyan
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds._deviceExists[0] = true;
    ds._deviceExists[2] = true;
    ds.activate();
    var pads = fakeQuadrant().bottomLeft.pads;
    var pad1Paint = pager.paints.filter(function(p) { return p.pad === pads[0]; });
    assert(pad1Paint.length > 0 && pad1Paint[pad1Paint.length - 1].color === '41_dim',
        'existing device pad should be dim cyan');
    var pad3Paint = pager.paints.filter(function(p) { return p.pad === pads[2]; });
    assert(pad3Paint.length > 0 && pad3Paint[pad3Paint.length - 1].color === '41_dim',
        'existing device pad 3 should be dim cyan');
})();

// activate paints cursor device position dim cyan
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds._deviceExists[1] = true;
    ds._cursorDevicePosition = 1;
    ds.activate();
    var pads = fakeQuadrant().bottomLeft.pads;
    var padPaint = pager.paints.filter(function(p) { return p.pad === pads[1]; });
    assert(padPaint.length > 0 && padPaint[padPaint.length - 1].color === '41_bright',
        'cursor device pad should be bright cyan');
})();

// activate paints pads 13 and 14 (reserved) dark
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var pads = fakeQuadrant().bottomLeft.pads;
    var reserved13Paint = pager.paints.filter(function(p) { return p.pad === pads[12]; });
    assert(reserved13Paint.length > 0, 'should paint reserved pad 13');
    assert(reserved13Paint[0].color === 0, 'reserved pad 13 should be dark');
    var reserved14Paint = pager.paints.filter(function(p) { return p.pad === pads[13]; });
    assert(reserved14Paint.length > 0, 'should paint reserved pad 14');
    assert(reserved14Paint[0].color === 0, 'reserved pad 14 should be dark');
})();

// activate paints pad 15 (solo) with dim yellow
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var soloPaint = pager.paints.filter(function(p) { return p.pad === 43; });
    assert(soloPaint.length > 0, 'should paint solo pad');
    assert(soloPaint[0].color === '13_bright', 'solo pad should be bright yellow when not soloed');
})();

// activate paints pad 16 (exit) with dim white
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var exitPaint = pager.paints.filter(function(p) { return p.pad === 44; });
    assert(exitPaint.length > 0, 'should paint exit pad');
    assert(exitPaint[0].color === '3_bright', 'exit pad should be bright white');
})();

// pad 15 click toggles cursor track solo
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var ds = makeSubject({ launchpad: lp, bitwig: bw });
    ds.activate();
    lp.behaviors[43].click();
    assert(bw._soloed() === true, 'clicking solo pad should toggle solo on');
    lp.behaviors[43].click();
    assert(bw._soloed() === false, 'clicking solo pad again should toggle solo off');
})();

// pad 16 click calls deactivate then exit callback
(function() {
    var lp = fakeLaunchpad();
    var exitCalled = false;
    var ds = makeSubject({ launchpad: lp });
    ds.activate(null, function() { exitCalled = true; });
    lp.behaviors[44].click();
    assert(ds.isActive() === false, 'should deactivate on exit click');
    assert(exitCalled === true, 'should call exit callback');
})();

// clicking device pad with existing device calls onDeviceSelected
(function() {
    var lp = fakeLaunchpad();
    var selectedDevice = null;
    var ds = makeSubject({ launchpad: lp });
    ds._deviceExists[2] = true;
    ds.activate(function(idx) { selectedDevice = idx; }, function() {});
    // Pad 3 (index 2) = pads[2] = 13
    lp.behaviors[13].click();
    assert(selectedDevice === 2, 'clicking existing device should call onDeviceSelected with index');
})();

// clicking empty device pad opens device browser
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var selectedDevice = null;
    var ds = makeSubject({ launchpad: lp, bitwig: bw });
    ds.activate(function(idx) { selectedDevice = idx; }, function() {});
    lp.behaviors[11].click(); // device 0 doesn't exist
    assert(selectedDevice === null, 'clicking empty device pad should not call onDeviceSelected');
    assert(bw._browseCalls.length === 1, 'clicking empty device pad should call browse()');
})();

// deactivate clears all pads
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var clearsBefore = pager.clears.length;
    ds.deactivate();
    assert(pager.clears.length - clearsBefore === 16, 'should clear all 16 pads');
})();

// deactivate is idempotent
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    ds.deactivate();
    pager.clears = [];
    ds.deactivate();
    assert(pager.clears.length === 0, 'second deactivate should be no-op');
})();

// onDeviceExistsChanged repaints all 12 device pads when active
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var paintsBefore = pager.paints.length;
    ds.onDeviceExistsChanged(3, true);
    var newPaints = pager.paints.slice(paintsBefore);
    var pads = fakeQuadrant().bottomLeft.pads;
    // Should repaint all 12 device pads
    for (var i = 0; i < 12; i++) {
        var padPaint = newPaints.filter(function(p) { return p.pad === pads[i]; });
        assert(padPaint.length > 0, 'should repaint device pad ' + i);
    }
    var pad4Paint = newPaints.filter(function(p) { return p.pad === pads[3]; });
    assert(pad4Paint[pad4Paint.length - 1].color === '41_dim', 'new device should be dim cyan');
})();

// onDeviceExistsChanged is no-op when inactive
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    var paintsBefore = pager.paints.length;
    ds.onDeviceExistsChanged(0, true);
    assert(pager.paints.length === paintsBefore, 'should not paint when inactive');
})();

// onCursorDevicePositionChanged updates highlighting
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds._deviceExists[0] = true;
    ds._deviceExists[2] = true;
    ds._cursorDevicePosition = 0;
    ds.activate();
    var paintsBefore = pager.paints.length;
    ds.onCursorDevicePositionChanged(2);
    var newPaints = pager.paints.slice(paintsBefore);
    var pads = fakeQuadrant().bottomLeft.pads;
    // Old position (0) should be bright (de-selected)
    var pad1Paint = newPaints.filter(function(p) { return p.pad === pads[0]; });
    assert(pad1Paint.length > 0 && pad1Paint[0].color === '41_dim', 'old position should be dim cyan');
    // New position (2) should be bright (selected)
    var pad3Paint = newPaints.filter(function(p) { return p.pad === pads[2]; });
    assert(pad3Paint.length > 0 && pad3Paint[0].color === '41_bright', 'new position should be bright cyan');
})();

// onCursorDevicePositionChanged is no-op when inactive
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    var paintsBefore = pager.paints.length;
    ds.onCursorDevicePositionChanged(3);
    assert(pager.paints.length === paintsBefore, 'should not paint when inactive');
})();

// onCursorTrackSoloChanged repaints solo pad when active
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var paintsBefore = pager.paints.length;
    ds.onCursorTrackSoloChanged(true);
    var newPaints = pager.paints.slice(paintsBefore);
    var soloPaint = newPaints.filter(function(p) { return p.pad === 43; });
    assert(soloPaint.length > 0, 'should repaint solo pad on solo change');
    assert(soloPaint[0].color === '13_dim', 'solo pad should be dim yellow when soloed');
})();

// onCursorTrackSoloChanged is no-op when inactive
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    var paintsBefore = pager.paints.length;
    ds.onCursorTrackSoloChanged(true);
    assert(pager.paints.length === paintsBefore, 'should not paint when inactive');
})();

// pad behaviors use correct page number
(function() {
    var lp = fakeLaunchpad();
    var ds = makeSubject({ launchpad: lp, pageNumber: 7 });
    ds.activate();
    assert(lp.behaviors[43].page === 7, 'solo pad behavior should use correct page number');
    assert(lp.behaviors[44].page === 7, 'exit pad behavior should use correct page number');
    // Device pad behaviors too
    assert(lp.behaviors[11].page === 7, 'device pad behavior should use correct page number');
})();

// deactivate clears pad behaviors
(function() {
    var lp = fakeLaunchpad();
    var ds = makeSubject({ launchpad: lp });
    ds.activate();
    assert(lp.behaviors[43], 'precondition: solo pad has behavior');
    ds.deactivate();
    assert(!lp.behaviors[43], 'deactivate should clear solo pad behavior');
    assert(!lp.behaviors[44], 'deactivate should clear exit pad behavior');
})();

// first empty pad after existing devices is dim green, subsequent empties are dark
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds._deviceExists[0] = true;
    ds._deviceExists[1] = true;
    ds.activate();
    var pads = fakeQuadrant().bottomLeft.pads;
    // Pad 3 (index 2) is the first empty slot
    var pad3Paint = pager.paints.filter(function(p) { return p.pad === pads[2]; });
    assert(pad3Paint.length > 0 && pad3Paint[pad3Paint.length - 1].color === '21_dim',
        'first empty pad after devices should be dim green');
    // Pad 4 (index 3) should be dark
    var pad4Paint = pager.paints.filter(function(p) { return p.pad === pads[3]; });
    assert(pad4Paint.length > 0 && pad4Paint[pad4Paint.length - 1].color === 0,
        'subsequent empty pad should be dark');
})();

// onDeviceExistsChanged repaints add-indicator correctly and shifts green to next empty
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    // Initially pad 0 is first empty (dim green)
    var paintsBefore = pager.paints.length;
    ds.onDeviceExistsChanged(0, true);
    var newPaints = pager.paints.slice(paintsBefore);
    var pads = fakeQuadrant().bottomLeft.pads;
    // Pad 0 should now be dim cyan (existing device)
    var pad0Paint = newPaints.filter(function(p) { return p.pad === pads[0]; });
    assert(pad0Paint.length > 0 && pad0Paint[pad0Paint.length - 1].color === '41_dim', 'pad 0 should be dim cyan after device added');
    // Pad 1 should now be dim green (new first empty slot)
    var pad1Paint = newPaints.filter(function(p) { return p.pad === pads[1]; });
    assert(pad1Paint.length > 0 && pad1Paint[pad1Paint.length - 1].color === '21_dim', 'pad 1 should become dim green add-indicator');
    // Pad 2 should be dark (not the first empty)
    var pad2Paint = newPaints.filter(function(p) { return p.pad === pads[2]; });
    assert(pad2Paint.length > 0 && pad2Paint[pad2Paint.length - 1].color === 0, 'pad 2 should remain dark');
})();

// onDeviceExistsChanged repaints all 12 pads so green indicator shifts mid-chain
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds._deviceExists[0] = true;
    ds._deviceExists[1] = true;
    ds.activate();
    // Pad 2 is currently the first empty (dim green)
    var paintsBefore = pager.paints.length;
    ds.onDeviceExistsChanged(2, true);
    var newPaints = pager.paints.slice(paintsBefore);
    var pads = fakeQuadrant().bottomLeft.pads;
    // Pad 2 should now be dim cyan
    var pad2Paint = newPaints.filter(function(p) { return p.pad === pads[2]; });
    assert(pad2Paint.length > 0 && pad2Paint[pad2Paint.length - 1].color === '41_dim', 'pad 2 should be dim cyan after device added');
    // Pad 3 should now be dim green (new first empty)
    var pad3Paint = newPaints.filter(function(p) { return p.pad === pads[3]; });
    assert(pad3Paint.length > 0 && pad3Paint[pad3Paint.length - 1].color === '21_dim', 'pad 3 should become dim green add-indicator');
})();

// activate() syncs _deviceExists from device bank (fixes stale observer state)
(function() {
    var pager = fakePager(1);
    var bank = fakeDeviceBank([true, true, true, true, true]);
    var bw = fakeBitwig({ deviceBank: bank });
    var ds = makeSubject({ pager: pager, bitwig: bw });
    // _deviceExists is all-false by default (simulating missed observers)
    assert(ds._deviceExists[0] === false, 'precondition: _deviceExists[0] should be false');
    ds.activate();
    for (var i = 0; i < 5; i++) {
        assert(ds._deviceExists[i] === true, 'activate should sync _deviceExists[' + i + '] to true from bank');
    }
    for (var i = 5; i < 12; i++) {
        assert(ds._deviceExists[i] === false, '_deviceExists[' + i + '] should remain false');
    }
    // Verify painting: first 5 pads should be cyan, pad 6 should be dim green (first empty)
    var pads = fakeQuadrant().bottomLeft.pads;
    for (var i = 0; i < 5; i++) {
        var padPaint = pager.paints.filter(function(p) { return p.pad === pads[i]; });
        assert(padPaint.length > 0 && padPaint[padPaint.length - 1].color === '41_dim',
            'device pad ' + i + ' should be dim cyan after bank sync');
    }
    var pad5Paint = pager.paints.filter(function(p) { return p.pad === pads[5]; });
    assert(pad5Paint.length > 0 && pad5Paint[pad5Paint.length - 1].color === '21_dim',
        'first empty pad after synced devices should be dim green');
})();

process.exit(t.summary('DeviceSelector'));
