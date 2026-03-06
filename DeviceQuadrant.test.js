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
        colors: { off: 0, green: 21, red: 5, yellow: 13, white: 3, blue: 45, purple: 53 },
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
    var _enabled = true;
    var _paramNames = opts.paramNames || {};
    var _paramCalls = [];
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
                },
                setDirectParameterValueNormalized: function(id, value, resolution) {
                    _paramCalls.push({ id: id, value: value, resolution: resolution });
                }
            };
        },
        getDirectParamNames: function() { return _paramNames; },
        _soloed: function() { return _soloed; },
        _enabled: function() { return _enabled; },
        _paramCalls: _paramCalls
    };
}

function fakePadMapper() {
    var calls = [];
    return {
        calls: calls,
        _activateApi: null,
        activate: function(api) { this._activateApi = api; calls.push('activate'); },
        deactivate: function() { calls.push('deactivate'); },
        onParamValueChanged: function(id, value) { calls.push({ method: 'onParamValueChanged', id: id, value: value }); },
        onDirectParamNameChanged: function(id, name) { calls.push({ method: 'onDirectParamNameChanged', id: id, name: name }); }
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

// activate paints pad 14 (bypass) with bright green when enabled
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var bypassPaint = pager.paints.filter(function(p) { return p.pad === 42; });
    assert(bypassPaint.length > 0, 'should paint bypass pad');
    assert(bypassPaint[0].color === '21_dim', 'bypass pad should be dim green when enabled');
})();

// activate paints pad 15 (solo) with dim yellow
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var soloPaint = pager.paints.filter(function(p) { return p.pad === 43; });
    assert(soloPaint.length > 0, 'should paint solo pad');
    assert(soloPaint[0].color === '13_bright', 'solo pad should be bright yellow when not soloed');
})();

// activate paints pad 16 (exit) with dim white
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate();
    var exitPaint = pager.paints.filter(function(p) { return p.pad === 44; });
    assert(exitPaint.length > 0, 'should paint exit pad');
    assert(exitPaint[0].color === '3_bright', 'exit pad should be bright white');
})();

// activate registers pad behaviors on pads 14-16
(function() {
    var lp = fakeLaunchpad();
    var dq = makeSubject({ launchpad: lp });
    dq.activate();
    assert(lp.behaviors[42], 'pad 14 (bypass) should have behavior');
    assert(lp.behaviors[43], 'pad 15 (solo) should have behavior');
    assert(lp.behaviors[44], 'pad 16 (exit) should have behavior');
})();

// pad 14 click toggles cursor device enabled
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate();
    lp.behaviors[42].click();
    assert(bw._enabled() === false, 'clicking bypass pad should toggle enabled off');
    lp.behaviors[42].click();
    assert(bw._enabled() === true, 'clicking bypass pad again should toggle enabled on');
})();

// pad 15 click toggles cursor track solo
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate();
    lp.behaviors[43].click();
    assert(bw._soloed() === true, 'clicking solo pad should toggle solo on');
    lp.behaviors[43].click();
    assert(bw._soloed() === false, 'clicking solo pad again should toggle solo off');
})();

// pad 16 click calls exit callback then deactivate (callback runs while still active)
(function() {
    var lp = fakeLaunchpad();
    var wasActiveInCallback = false;
    var dq = makeSubject({ launchpad: lp });
    dq.activate(function() {
        wasActiveInCallback = dq.isActive();
        dq.deactivate(); // callback triggers deactivate (mirrors Controller.enterTrackMode)
    });
    lp.behaviors[44].click();
    assert(wasActiveInCallback === true, 'should still be active when exit callback runs');
    assert(dq.isActive() === false, 'should be deactivated after callback');
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
    var bypassPaint = newPaints.filter(function(p) { return p.pad === 42; });
    assert(bypassPaint.length > 0, 'should repaint bypass pad on enabled change');
    assert(bypassPaint[0].color === '5_bright', 'bypass pad should be bright red when disabled');
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
    var soloPaint = newPaints.filter(function(p) { return p.pad === 43; });
    assert(soloPaint.length > 0, 'should repaint solo pad on solo change');
    assert(soloPaint[0].color === '13_dim', 'solo pad should be dim yellow when soloed');
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
    assert(lp.behaviors[42].page === 7, 'bypass pad behavior should use correct page number');
    assert(lp.behaviors[43].page === 7, 'solo pad behavior should use correct page number');
    assert(lp.behaviors[44].page === 7, 'exit pad behavior should use correct page number');
})();

// activate clears stale pad behaviors from track grid
(function() {
    var lp = fakeLaunchpad();
    var dq = makeSubject({ launchpad: lp });
    // Simulate stale behavior from track grid mode
    lp.registerPadBehavior(11, function() {}, null, 1);
    assert(lp.behaviors[11], 'precondition: pad 11 has a stale behavior');
    dq.activate();
    // After activate, pad 11 should have been cleared then NOT re-registered (it's in pads 1-13 range)
    assert(!lp.behaviors[11], 'activate should clear stale track grid behavior on pad 1');
})();

// deactivate clears pad behaviors so track grid can register fresh ones
(function() {
    var lp = fakeLaunchpad();
    var dq = makeSubject({ launchpad: lp });
    dq.activate();
    // pad 14 (solo) gets a behavior registered during activate
    assert(lp.behaviors[42], 'precondition: bypass pad has behavior');
    dq.deactivate();
    assert(!lp.behaviors[42], 'deactivate should clear bypass pad behavior');
    assert(!lp.behaviors[43], 'deactivate should clear solo pad behavior');
    assert(!lp.behaviors[44], 'deactivate should clear exit pad behavior');
})();

// activate without padMapper is fine
(function() {
    var dq = makeSubject();
    dq.activate();
    assert(dq._activePadMapper === null, 'should have no pad mapper without one provided');
    assert(dq.isActive() === true, 'should still be active');
})();

// ---- pad mapper delegation tests ----

// activate with padMapper calls padMapper.activate with QuadrantAPI
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    dq.activate(null, pm);
    assert(pm.calls.indexOf('activate') !== -1, 'should call padMapper.activate');
    assert(pm._activateApi !== null, 'should pass QuadrantAPI to padMapper');
    assert(typeof pm._activateApi.paintPad === 'function', 'QuadrantAPI should have paintPad');
    assert(typeof pm._activateApi.registerPadBehavior === 'function', 'QuadrantAPI should have registerPadBehavior');
    assert(typeof pm._activateApi.resolveParamName === 'function', 'QuadrantAPI should have resolveParamName');
    assert(typeof pm._activateApi.setDeviceParam === 'function', 'QuadrantAPI should have setDeviceParam');
})();

// deactivate calls padMapper.deactivate and clears reference
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    dq.activate(null, pm);
    dq.deactivate();
    assert(pm.calls.indexOf('deactivate') !== -1, 'should call padMapper.deactivate');
    assert(dq._activePadMapper === null, 'should clear pad mapper reference');
})();

// onParamValueChanged forwards to padMapper
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    dq.activate(null, pm);
    dq.onParamValueChanged('PID_MODE', 0.25);
    var paramCalls = pm.calls.filter(function(c) { return c.method === 'onParamValueChanged'; });
    assert(paramCalls.length === 1, 'should forward onParamValueChanged to padMapper');
    assert(paramCalls[0].id === 'PID_MODE', 'should pass correct param ID');
    assert(paramCalls[0].value === 0.25, 'should pass correct value');
})();

// onParamValueChanged strips ROOT_GENERIC_MODULE/ prefix before forwarding
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    dq.activate(null, pm);
    dq.onParamValueChanged('ROOT_GENERIC_MODULE/CONTENTS/PID3339a3', 0.5);
    var paramCalls = pm.calls.filter(function(c) { return c.method === 'onParamValueChanged'; });
    assert(paramCalls.length === 1, 'should forward onParamValueChanged');
    assert(paramCalls[0].id === 'CONTENTS/PID3339a3', 'should strip ROOT_GENERIC_MODULE/ prefix');
})();

// onParamValueChanged is no-op when inactive
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    // not activated
    dq.onParamValueChanged('PID_MODE', 0.25);
    assert(pm.calls.length === 0, 'should not forward when inactive');
})();

// onParamValueChanged is no-op when no padMapper
(function() {
    var pager = fakePager(1);
    var dq = makeSubject({ pager: pager });
    dq.activate(); // no padMapper
    var paintsBefore = pager.paints.length;
    dq.onParamValueChanged('PID_MODE', 0.25);
    assert(pager.paints.length === paintsBefore, 'should not repaint without padMapper');
})();

// onDirectParamNameChanged forwards to padMapper
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    dq.activate(null, pm);
    dq.onDirectParamNameChanged('PID_MODE', 'Mode');
    var nameCalls = pm.calls.filter(function(c) { return c.method === 'onDirectParamNameChanged'; });
    assert(nameCalls.length === 1, 'should forward onDirectParamNameChanged to padMapper');
    assert(nameCalls[0].id === 'PID_MODE', 'should pass correct param ID');
    assert(nameCalls[0].name === 'Mode', 'should pass correct name');
})();

// onDirectParamNameChanged strips ROOT_GENERIC_MODULE/ prefix before forwarding
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    dq.activate(null, pm);
    dq.onDirectParamNameChanged('ROOT_GENERIC_MODULE/CONTENTS/PID3339a3', 'Mode');
    var nameCalls = pm.calls.filter(function(c) { return c.method === 'onDirectParamNameChanged'; });
    assert(nameCalls.length === 1, 'should forward onDirectParamNameChanged');
    assert(nameCalls[0].id === 'CONTENTS/PID3339a3', 'should strip ROOT_GENERIC_MODULE/ prefix');
})();

// onDirectParamNameChanged is no-op when inactive
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    dq.onDirectParamNameChanged('PID_MODE', 'Mode');
    assert(pm.calls.length === 0, 'should not forward when inactive');
})();

// onDirectParamNameChanged is no-op when no padMapper
(function() {
    var dq = makeSubject();
    dq.activate(); // no padMapper
    dq.onDirectParamNameChanged('PID_MODE', 'Mode'); // should not throw
    assert(true, 'should be no-op without padMapper');
})();

// ---- applyPadMapper tests ----

// applyPadMapper deactivates old mapper and activates new one
(function() {
    var pm1 = fakePadMapper();
    var pm2 = fakePadMapper();
    var dq = makeSubject();
    dq.activate(null, pm1);
    dq.applyPadMapper(pm2);
    assert(pm1.calls.indexOf('deactivate') !== -1, 'should deactivate old mapper');
    assert(pm2.calls.indexOf('activate') !== -1, 'should activate new mapper');
    assert(dq._activePadMapper === pm2, 'should store new mapper');
})();

// applyPadMapper clears pads 1-13 before applying new mapper
(function() {
    var lp = fakeLaunchpad();
    var pager = fakePager(1);
    var pm = fakePadMapper();
    var dq = makeSubject({ launchpad: lp, pager: pager });
    dq.activate(null, pm);
    var clearsBefore = lp.calls.filter(function(c) { return c.method === 'clearPadBehavior'; }).length;
    dq.applyPadMapper(fakePadMapper());
    var clearsAfter = lp.calls.filter(function(c) { return c.method === 'clearPadBehavior'; }).length;
    assert(clearsAfter - clearsBefore === 13, 'should clear behaviors on pads 1-13');
})();

// applyPadMapper(null) clears without adding new mapper
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    dq.activate(null, pm);
    dq.applyPadMapper(null);
    assert(pm.calls.indexOf('deactivate') !== -1, 'should deactivate old mapper');
    assert(dq._activePadMapper === null, 'should have no active mapper');
})();

// applyPadMapper is no-op when inactive
(function() {
    var pm = fakePadMapper();
    var dq = makeSubject();
    dq.applyPadMapper(pm);
    assert(pm.calls.length === 0, 'should not activate mapper when inactive');
    assert(dq._activePadMapper === null, 'should not store mapper when inactive');
})();

// ---- QuadrantAPI integration tests ----

// QuadrantAPI.paintPad maps padIndex to correct pad note
(function() {
    var pager = fakePager(1);
    var pm = fakePadMapper();
    var dq = makeSubject({ pager: pager });
    dq.activate(null, pm);
    var paintsBefore = pager.paints.length;
    // padIndex 5 → pads[4] = 21
    pm._activateApi.paintPad(5, 42);
    var newPaints = pager.paints.slice(paintsBefore);
    assert(newPaints.length === 1, 'should paint one pad');
    assert(newPaints[0].pad === 21, 'padIndex 5 should map to MIDI note 21');
    assert(newPaints[0].color === 42, 'should use the specified color');
})();

// QuadrantAPI.registerPadBehavior uses correct page number
(function() {
    var lp = fakeLaunchpad();
    var pm = fakePadMapper();
    var dq = makeSubject({ launchpad: lp, pageNumber: 7 });
    dq.activate(null, pm);
    var clicked = false;
    // padIndex 1 → pads[0] = 11
    pm._activateApi.registerPadBehavior(1, function() { clicked = true; });
    assert(lp.behaviors[11], 'padIndex 1 should register on MIDI note 11');
    assert(lp.behaviors[11].page === 7, 'should use correct page number');
    lp.behaviors[11].click();
    assert(clicked === true, 'callback should be invocable');
})();

// QuadrantAPI.resolveParamName delegates to _resolveParamName
(function() {
    var bw = fakeBitwig({ paramNames: { 'PID_MODE': 'Mode' } });
    var pm = fakePadMapper();
    var dq = makeSubject({ bitwig: bw });
    dq.activate(null, pm);
    var result = pm._activateApi.resolveParamName('Mode');
    assert(result === 'PID_MODE', 'should resolve param name through Bitwig');
    var missing = pm._activateApi.resolveParamName('Missing');
    assert(missing === null, 'should return null for unknown param');
})();

// QuadrantAPI.setDeviceParam calls cursor device
(function() {
    var bw = fakeBitwig();
    var pm = fakePadMapper();
    var dq = makeSubject({ bitwig: bw });
    dq.activate(null, pm);
    pm._activateApi.setDeviceParam('PID_MODE', 1, 5);
    assert(bw._paramCalls.length === 1, 'should call setDirectParameterValueNormalized');
    assert(bw._paramCalls[0].id === 'PID_MODE', 'should pass param ID');
    assert(bw._paramCalls[0].value === 1, 'should pass value');
    assert(bw._paramCalls[0].resolution === 5, 'should pass resolution');
})();

// pad 16 exit deactivates pad mapper
(function() {
    var lp = fakeLaunchpad();
    var pm = fakePadMapper();
    var exitCalled = false;
    var dq = makeSubject({ launchpad: lp });
    dq.activate(function() { exitCalled = true; }, pm);
    lp.behaviors[44].click();
    assert(pm.calls.indexOf('deactivate') !== -1, 'exit should deactivate pad mapper');
    assert(exitCalled === true, 'should call exit callback');
})();

process.exit(t.summary('DeviceQuadrant'));
