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
        _soloed: function() { return _soloed; }
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

// activate paints empty device pads dark (pads 1-13)
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var pads = fakeQuadrant().bottomLeft.pads;
    for (var i = 0; i < 13; i++) {
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

// activate paints pad 14 (reserved) dark
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var reservedPaint = pager.paints.filter(function(p) { return p.pad === 42; });
    assert(reservedPaint.length > 0, 'should paint reserved pad');
    assert(reservedPaint[0].color === 0, 'reserved pad should be dark');
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

// clicking empty device pad is no-op
(function() {
    var lp = fakeLaunchpad();
    var selectedDevice = null;
    var ds = makeSubject({ launchpad: lp });
    ds.activate(function(idx) { selectedDevice = idx; }, function() {});
    lp.behaviors[11].click(); // device 0 doesn't exist
    assert(selectedDevice === null, 'clicking empty device pad should be no-op');
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

// onDeviceExistsChanged updates pad when active
(function() {
    var pager = fakePager(1);
    var ds = makeSubject({ pager: pager });
    ds.activate();
    var paintsBefore = pager.paints.length;
    ds.onDeviceExistsChanged(3, true);
    var newPaints = pager.paints.slice(paintsBefore);
    var pads = fakeQuadrant().bottomLeft.pads;
    var pad4Paint = newPaints.filter(function(p) { return p.pad === pads[3]; });
    assert(pad4Paint.length > 0, 'should repaint pad when device exists changes');
    assert(pad4Paint[0].color === '41_dim', 'new device should be dim cyan');
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

process.exit(t.summary('DeviceSelector'));
