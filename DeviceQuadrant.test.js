var DeviceQuadrantHW = require('./DeviceQuadrant');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    var behaviors = {};
    var padColors = {};
    var padLinks = {};
    var calls = [];
    return {
        colors: { off: 0, green: 21, red: 5, yellow: 13, white: 3 },
        brightness: { dim: 'dim', bright: 'bright' },
        calls: calls,
        behaviors: behaviors,
        padColors: padColors,
        padLinks: padLinks,
        unlinkPad: function(pad) { delete padLinks[pad]; calls.push({ method: 'unlinkPad', pad: pad }); },
        registerPadBehavior: function(pad, click, hold, page) { behaviors[pad] = { click: click, hold: hold, page: page }; },
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

function fakeBitwig() {
    var _soloed = false;
    var _enabled = true;
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
                isEnabled: function() {
                    return {
                        get: function() { return _enabled; },
                        toggle: function() { _enabled = !_enabled; }
                    };
                }
            };
        },
        _soloed: function() { return _soloed; },
        _enabled: function() { return _enabled; }
    };
}

function makeSubject(opts) {
    opts = opts || {};
    return new DeviceQuadrantHW({
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
    var dq = makeSubject();
    assert(dq.isActive() === false, 'should be inactive before activate()');
})();

// activate sets active state
(function() {
    var dq = makeSubject();
    dq.activate(function() {});
    assert(dq.isActive() === true, 'should be active after activate()');
})();

// activate unlinks all 16 track grid pads
(function() {
    var lp = fakeLaunchpad();
    var dq = makeSubject({ launchpad: lp });
    dq.activate();
    var unlinkCalls = lp.calls.filter(function(c) { return c.method === 'unlinkPad'; });
    assert(unlinkCalls.length === 16, 'should unlink all 16 pads');
})();

// activate paints pads 1-13 dark
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var pads = fakeQuadrant().bottomLeft.pads;
    for (var i = 0; i < 13; i++) {
        var found = pager.paints.some(function(p) { return p.pad === pads[i] && p.color === 0; });
        assert(found, 'pad ' + (i + 1) + ' (note ' + pads[i] + ') should be painted dark');
    }
})();

// activate paints pad 14 (solo) with dim yellow
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var soloPaint = pager.paints.filter(function(p) { return p.pad === 42; });
    assert(soloPaint.length > 0, 'should paint solo pad');
    assert(soloPaint[0].color === '13_dim', 'solo pad should be dim yellow when not soloed');
})();

// activate paints pad 15 (bypass) with bright green when enabled
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var bypassPaint = pager.paints.filter(function(p) { return p.pad === 43; });
    assert(bypassPaint.length > 0, 'should paint bypass pad');
    assert(bypassPaint[0].color === '21_bright', 'bypass pad should be bright green when enabled');
})();

// activate paints pad 16 (exit) with dim white
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var exitPaint = pager.paints.filter(function(p) { return p.pad === 44; });
    assert(exitPaint.length > 0, 'should paint exit pad');
    assert(exitPaint[0].color === '3_dim', 'exit pad should be dim white');
})();

// activate registers pad behaviors on pads 14-16
(function() {
    var lp = fakeLaunchpad();
    var dq = makeSubject({ launchpad: lp });
    dq.activate();
    assert(lp.behaviors[42], 'pad 14 (solo) should have behavior');
    assert(lp.behaviors[43], 'pad 15 (bypass) should have behavior');
    assert(lp.behaviors[44], 'pad 16 (exit) should have behavior');
})();

// pad 14 click toggles cursor track solo
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate();
    lp.behaviors[42].click();
    assert(bw._soloed() === true, 'clicking solo pad should toggle solo on');
    lp.behaviors[42].click();
    assert(bw._soloed() === false, 'clicking solo pad again should toggle solo off');
})();

// pad 15 click toggles cursor device enabled
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate();
    lp.behaviors[43].click();
    assert(bw._enabled() === false, 'clicking bypass pad should toggle enabled off');
    lp.behaviors[43].click();
    assert(bw._enabled() === true, 'clicking bypass pad again should toggle enabled on');
})();

// pad 16 click calls deactivate then exit callback
(function() {
    var lp = fakeLaunchpad();
    var exitCalled = false;
    var dq = makeSubject({ launchpad: lp });
    dq.activate(function() { exitCalled = true; });
    lp.behaviors[44].click();
    assert(dq.isActive() === false, 'should deactivate on exit click');
    assert(exitCalled === true, 'should call exit callback');
})();

// deactivate clears all quadrant pads
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var clearsBefore = pager.clears.length;
    dq.deactivate();
    assert(pager.clears.length - clearsBefore === 16, 'should clear all 16 pads');
})();

// deactivate is idempotent (second call is no-op)
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    dq.deactivate();
    pager.clears = [];
    dq.deactivate();
    assert(pager.clears.length === 0, 'second deactivate should be no-op');
})();

// onDeviceEnabledChanged repaints bypass pad when active
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var paintsBefore = pager.paints.length;
    dq.onDeviceEnabledChanged(false);
    var newPaints = pager.paints.slice(paintsBefore);
    var bypassPaint = newPaints.filter(function(p) { return p.pad === 43; });
    assert(bypassPaint.length > 0, 'should repaint bypass pad on enabled change');
    assert(bypassPaint[0].color === '5_dim', 'bypass pad should be dim red when disabled');
})();

// onDeviceEnabledChanged is no-op when inactive
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    var paintsBefore = pager.paints.length;
    dq.onDeviceEnabledChanged(false);
    assert(pager.paints.length === paintsBefore, 'should not paint when inactive');
})();

// onCursorTrackSoloChanged repaints solo pad when active
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var paintsBefore = pager.paints.length;
    dq.onCursorTrackSoloChanged(true);
    var newPaints = pager.paints.slice(paintsBefore);
    var soloPaint = newPaints.filter(function(p) { return p.pad === 42; });
    assert(soloPaint.length > 0, 'should repaint solo pad on solo change');
    assert(soloPaint[0].color === '13_bright', 'solo pad should be bright yellow when soloed');
})();

// onCursorTrackSoloChanged is no-op when inactive
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    var paintsBefore = pager.paints.length;
    dq.onCursorTrackSoloChanged(true);
    assert(pager.paints.length === paintsBefore, 'should not paint when inactive');
})();

// pad behaviors use correct page number
(function() {
    var lp = fakeLaunchpad();
    var dq = makeSubject({ launchpad: lp, pageNumber: 7 });
    dq.activate();
    assert(lp.behaviors[42].page === 7, 'solo pad behavior should use correct page number');
    assert(lp.behaviors[43].page === 7, 'bypass pad behavior should use correct page number');
    assert(lp.behaviors[44].page === 7, 'exit pad behavior should use correct page number');
})();

process.exit(t.summary('DeviceQuadrant'));
