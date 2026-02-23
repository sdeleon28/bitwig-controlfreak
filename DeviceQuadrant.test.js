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

// ---- pad config tests ----

function makePadConfig() {
    return [
        { pad: 9, paramName: 'Mode', value: 0, resolution: 5, color: 'white' },
        { pad: 5, paramName: 'Mode', value: 1, resolution: 5, color: 'blue' },
        { pad: 6, paramName: 'Mode', value: 2, resolution: 5, color: 'purple' },
    ];
}

function fakeBitwigWithMode() {
    return fakeBitwig({ paramNames: { 'CONTENTS/PIDmode123': 'Mode' } });
}

// activate with padConfig resolves param names and registers behaviors
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwigWithMode();
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate(null, makePadConfig());
    var pads = fakeQuadrant().bottomLeft.pads;
    // pad 9 = index 8 = note 31, pad 5 = index 4 = note 21, pad 6 = index 5 = note 22
    assert(lp.behaviors[31], 'pad 9 should have behavior registered');
    assert(lp.behaviors[21], 'pad 5 should have behavior registered');
    assert(lp.behaviors[22], 'pad 6 should have behavior registered');
})();

// pad config click sets the correct normalized value on the device
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwigWithMode();
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate(null, makePadConfig());
    // Click pad 5 (value=1, resolution=5 → raw value=1)
    lp.behaviors[21].click();
    assert(bw._paramCalls.length === 1, 'should call setDirectParameterValueNormalized');
    assert(bw._paramCalls[0].id === 'CONTENTS/PIDmode123', 'should use resolved param ID');
    assert(bw._paramCalls[0].value === 1, 'should set raw value 1');
    assert(bw._paramCalls[0].resolution === 5, 'should pass resolution');
})();

// pad config paints pads with dim brightness initially
(function() {
    var pager = fakePager(1);
    var bw = fakeBitwigWithMode();
    var dq = makeSubject({ pager: pager, bitwig: bw });
    dq.activate(null, makePadConfig());
    // pad 9 (index 8 = note 31) should be painted dim white
    var pad9Paint = pager.paints.filter(function(p) { return p.pad === 31 && p.color === '3_dim'; });
    assert(pad9Paint.length > 0, 'pad 9 should be painted dim white');
    // pad 5 (index 4 = note 21) should be painted dim blue
    var pad5Paint = pager.paints.filter(function(p) { return p.pad === 21 && p.color === '45_dim'; });
    assert(pad5Paint.length > 0, 'pad 5 should be painted dim blue');
})();

// onParamValueChanged highlights the active mode pad bright, others dim
(function() {
    var pager = fakePager(1);
    var bw = fakeBitwigWithMode();
    var dq = makeSubject({ pager: pager, bitwig: bw });
    dq.activate(null, makePadConfig());
    var paintsBefore = pager.paints.length;
    // Simulate mode changed to value 1 (normalized 0.25 = Mid)
    dq.onParamValueChanged('CONTENTS/PIDmode123', 0.25);
    var newPaints = pager.paints.slice(paintsBefore);
    // pad 5 (value=1, norm=0.25) should be bright blue
    var pad5 = newPaints.filter(function(p) { return p.pad === 21; });
    assert(pad5.length > 0, 'pad 5 should be repainted');
    assert(pad5[0].color === '45_bright', 'active mode pad should be bright');
    // pad 9 (value=0, norm=0) should be dim white
    var pad9 = newPaints.filter(function(p) { return p.pad === 31; });
    assert(pad9.length > 0, 'pad 9 should be repainted');
    assert(pad9[0].color === '3_dim', 'inactive mode pad should be dim');
})();

// onParamValueChanged is no-op when inactive
(function() {
    var pager = fakePager(1);
    var bw = fakeBitwigWithMode();
    var dq = makeSubject({ pager: pager, bitwig: bw });
    var paintsBefore = pager.paints.length;
    dq.onParamValueChanged('CONTENTS/PIDmode123', 0.25);
    assert(pager.paints.length === paintsBefore, 'should not paint when inactive');
})();

// onParamValueChanged ignores unrelated param IDs
(function() {
    var pager = fakePager(1);
    var bw = fakeBitwigWithMode();
    var dq = makeSubject({ pager: pager, bitwig: bw });
    dq.activate(null, makePadConfig());
    var paintsBefore = pager.paints.length;
    dq.onParamValueChanged('CONTENTS/PIDother', 0.5);
    assert(pager.paints.length === paintsBefore, 'should not repaint for unrelated param');
})();

// deactivate clears pad config state
(function() {
    var bw = fakeBitwigWithMode();
    var dq = makeSubject({ bitwig: bw });
    dq.activate(null, makePadConfig());
    dq.deactivate();
    assert(dq._padEntries.length === 0, 'pad entries should be cleared on deactivate');
    assert(dq._modeParamId === null, 'mode param ID should be cleared on deactivate');
})();

// activate without padConfig does not set up pad entries
(function() {
    var dq = makeSubject();
    dq.activate();
    assert(dq._padEntries.length === 0, 'should have no pad entries without config');
    assert(dq._modeParamId === null, 'should have no mode param without config');
})();

// unresolvable param name is skipped gracefully
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig({ paramNames: {} }); // no params registered
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate(null, [{ pad: 1, paramName: 'Missing', value: 0, resolution: 5, color: 'white' }]);
    assert(dq._padEntries.length === 0, 'should skip unresolvable params');
    assert(!lp.behaviors[11], 'should not register behavior for unresolvable param');
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
    assert(lp.behaviors[42], 'precondition: solo pad has behavior');
    dq.deactivate();
    assert(!lp.behaviors[42], 'deactivate should clear solo pad behavior');
    assert(!lp.behaviors[43], 'deactivate should clear bypass pad behavior');
    assert(!lp.behaviors[44], 'deactivate should clear exit pad behavior');
})();

// applyPadConfig clears old device pads and applies new config
(function() {
    var lp = fakeLaunchpad();
    var pager = fakePager(1);
    var bw = fakeBitwigWithMode();
    var dq = makeSubject({ launchpad: lp, pager: pager, bitwig: bw });
    dq.activate(null, makePadConfig());
    assert(dq._padEntries.length === 3, 'precondition: 3 pad entries');
    assert(lp.behaviors[31], 'precondition: pad 9 has behavior');
    // Re-apply with null = clear all device pads
    dq.applyPadConfig(null);
    assert(dq._padEntries.length === 0, 'applyPadConfig(null) should clear pad entries');
    assert(dq._modeParamId === null, 'applyPadConfig(null) should clear mode param');
    assert(!lp.behaviors[31], 'applyPadConfig(null) should clear old pad behaviors');
})();

// applyPadConfig replaces old config with new config
(function() {
    var lp = fakeLaunchpad();
    var pager = fakePager(1);
    var bw = fakeBitwig({ paramNames: { 'PID_A': 'Mode', 'PID_B': 'Other' } });
    var dq = makeSubject({ launchpad: lp, pager: pager, bitwig: bw });
    dq.activate(null, [{ pad: 1, paramName: 'Mode', value: 0, resolution: 2, color: 'white' }]);
    assert(dq._padEntries.length === 1, 'precondition: 1 pad entry');
    // Replace with different config
    dq.applyPadConfig([{ pad: 3, paramName: 'Other', value: 0, resolution: 2, color: 'blue' }]);
    assert(dq._padEntries.length === 1, 'should have 1 new pad entry');
    assert(dq._modeParamId === 'PID_B', 'should track new param ID');
    // Old pad 1 behavior should be gone, new pad 3 should exist
    assert(!lp.behaviors[11], 'old pad 1 behavior should be cleared');
    var pads = fakeQuadrant().bottomLeft.pads;
    assert(lp.behaviors[pads[2]], 'new pad 3 should have behavior');
})();

// applyPadConfig is no-op when inactive
(function() {
    var lp = fakeLaunchpad();
    var dq = makeSubject({ launchpad: lp });
    dq.applyPadConfig(makePadConfig());
    assert(dq._padEntries.length === 0, 'should not apply config when inactive');
})();

// ---- deferred resolution tests ----

// unresolvable param names are stashed as pending entries
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig({ paramNames: {} }); // no params registered yet
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate(null, makePadConfig());
    assert(dq._padEntries.length === 0, 'no entries should be resolved yet');
    assert(dq._pendingPadEntries.length === 3, 'all 3 entries should be pending');
})();

// onDirectParamNameChanged resolves pending entries
(function() {
    var lp = fakeLaunchpad();
    var pager = fakePager(1);
    var bw = fakeBitwig({ paramNames: {} });
    var dq = makeSubject({ launchpad: lp, pager: pager, bitwig: bw });
    dq.activate(null, makePadConfig());
    assert(dq._pendingPadEntries.length === 3, 'precondition: 3 pending');
    // Simulate name observer firing
    dq.onDirectParamNameChanged('CONTENTS/PIDmode123', 'Mode');
    assert(dq._padEntries.length === 3, 'all 3 entries should now be resolved');
    assert(dq._pendingPadEntries.length === 0, 'no entries should remain pending');
    assert(dq._modeParamId === 'CONTENTS/PIDmode123', 'mode param should be tracked');
    // Behaviors should be registered
    assert(lp.behaviors[31], 'pad 9 should have behavior after deferred resolve');
    assert(lp.behaviors[21], 'pad 5 should have behavior after deferred resolve');
    assert(lp.behaviors[22], 'pad 6 should have behavior after deferred resolve');
})();

// deferred resolution click sends raw value (not normalized)
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig({ paramNames: {} });
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate(null, makePadConfig());
    dq.onDirectParamNameChanged('PID_MODE', 'Mode');
    // Click pad 5 (value=1, resolution=5)
    lp.behaviors[21].click();
    assert(bw._paramCalls[0].value === 1, 'deferred click should send raw value');
    assert(bw._paramCalls[0].resolution === 5, 'deferred click should pass resolution');
})();

// onDirectParamNameChanged is no-op when inactive
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig({ paramNames: {} });
    var dq = makeSubject({ launchpad: lp, bitwig: bw });
    dq.activate(null, makePadConfig());
    dq.deactivate();
    dq.onDirectParamNameChanged('CONTENTS/PIDmode123', 'Mode');
    assert(dq._padEntries.length === 0, 'should not resolve when inactive');
})();

// onDirectParamNameChanged is no-op when no pending entries
(function() {
    var pager = fakePager(1);
    var bw = fakeBitwigWithMode();
    var dq = makeSubject({ pager: pager, bitwig: bw });
    dq.activate(null, makePadConfig());
    var entriesBefore = dq._padEntries.length;
    // All already resolved, no pending
    dq.onDirectParamNameChanged('CONTENTS/PIDmode123', 'Mode');
    assert(dq._padEntries.length === entriesBefore, 'should not add duplicate entries');
})();

// deactivate clears pending entries
(function() {
    var bw = fakeBitwig({ paramNames: {} });
    var dq = makeSubject({ bitwig: bw });
    dq.activate(null, makePadConfig());
    assert(dq._pendingPadEntries.length === 3, 'precondition: 3 pending');
    dq.deactivate();
    assert(dq._pendingPadEntries.length === 0, 'pending entries should be cleared on deactivate');
})();

// applyPadConfig(null) clears pending entries
(function() {
    var bw = fakeBitwig({ paramNames: {} });
    var dq = makeSubject({ bitwig: bw });
    dq.activate(null, makePadConfig());
    assert(dq._pendingPadEntries.length === 3, 'precondition: 3 pending');
    dq.applyPadConfig(null);
    assert(dq._pendingPadEntries.length === 0, 'pending entries should be cleared on applyPadConfig(null)');
})();

// onDirectParamNameChanged ignores unrelated param names
(function() {
    var bw = fakeBitwig({ paramNames: {} });
    var dq = makeSubject({ bitwig: bw });
    dq.activate(null, makePadConfig());
    dq.onDirectParamNameChanged('PID_OTHER', 'Frequency');
    assert(dq._pendingPadEntries.length === 3, 'unrelated name should not resolve pending entries');
    assert(dq._padEntries.length === 0, 'no entries should be resolved');
})();

process.exit(t.summary('DeviceQuadrant'));
