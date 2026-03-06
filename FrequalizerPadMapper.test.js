var FrequalizerPadMapper = require('./FrequalizerPadMapper');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeApi(opts) {
    opts = opts || {};
    var paints = [];
    var behaviors = {};
    var paramNames = opts.paramNames || {};
    var paramCalls = [];
    return {
        paints: paints,
        behaviors: behaviors,
        paramCalls: paramCalls,
        paintPad: function(padIndex, color) { paints.push({ padIndex: padIndex, color: color }); },
        registerPadBehavior: function(padIndex, callback) { behaviors[padIndex] = callback; },
        resolveParamName: function(name) {
            for (var id in paramNames) {
                if (paramNames[id] === name) return id;
            }
            return null;
        },
        setDeviceParam: function(paramId, value, resolution) {
            paramCalls.push({ id: paramId, value: value, resolution: resolution });
        }
    };
}

// ---- tests ----

// activate resolves param names and registers behaviors for all 5 pads
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    assert(api.behaviors[9], 'pad 9 (Stereo) should have behavior');
    assert(api.behaviors[5], 'pad 5 (Mid) should have behavior');
    assert(api.behaviors[6], 'pad 6 (Side) should have behavior');
    assert(api.behaviors[1], 'pad 1 (MidSolo) should have behavior');
    assert(api.behaviors[2], 'pad 2 (SideSolo) should have behavior');
})();

// activate paints pads with deselectedColor initially
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    var pad9Paint = api.paints.filter(function(p) { return p.padIndex === 9 && p.color === 1; });
    assert(pad9Paint.length > 0, 'pad 9 should be painted with deselectedColor');
    var pad5Paint = api.paints.filter(function(p) { return p.padIndex === 5 && p.color === 1; });
    assert(pad5Paint.length > 0, 'pad 5 should be painted with deselectedColor');
    var pad1Paint = api.paints.filter(function(p) { return p.padIndex === 1 && p.color === 1; });
    assert(pad1Paint.length > 0, 'pad 1 should be painted with deselectedColor');
})();

// click sets the correct value on the device
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    api.behaviors[5](); // pad 5: value=1, resolution=5
    assert(api.paramCalls.length === 1, 'should call setDeviceParam');
    assert(api.paramCalls[0].id === 'PID_MODE', 'should use resolved param ID');
    assert(api.paramCalls[0].value === 1, 'should set raw value 1');
    assert(api.paramCalls[0].resolution === 5, 'should pass resolution');
})();

// onParamValueChanged highlights the active mode pad, deselects others
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    var paintsBefore = api.paints.length;
    mapper.onParamValueChanged('PID_MODE', 0.25); // Mid = value 1, normalized 1/4
    var newPaints = api.paints.slice(paintsBefore);
    var pad5 = newPaints.filter(function(p) { return p.padIndex === 5; });
    assert(pad5.length > 0 && pad5[0].color === 21, 'Mid pad should get selectedColor');
    var pad9 = newPaints.filter(function(p) { return p.padIndex === 9; });
    assert(pad9.length > 0 && pad9[0].color === 1, 'Stereo pad should get deselectedColor');
})();

// onParamValueChanged ignores unrelated param
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    var paintsBefore = api.paints.length;
    mapper.onParamValueChanged('PID_OTHER', 0.5);
    assert(api.paints.length === paintsBefore, 'should not repaint for unrelated param');
})();

// deactivate clears structural state but keeps _currentModeValue
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    mapper.onParamValueChanged('PID_MODE', 0.5);
    mapper.deactivate();
    assert(mapper._padEntries.length === 0, 'pad entries should be cleared');
    assert(mapper._modeParamId === null, 'mode param should be cleared');
    assert(mapper._pendingPadEntries.length === 0, 'pending entries should be cleared');
    assert(mapper._api === null, 'api reference should be cleared');
    assert(mapper._currentModeValue === 0.5, '_currentModeValue should persist after deactivate');
})();

// deferred resolution: unresolvable names stashed as pending
(function() {
    var api = fakeApi({ paramNames: {} });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    assert(mapper._padEntries.length === 0, 'no entries should be resolved');
    assert(mapper._pendingPadEntries.length === 5, 'all 5 entries should be pending');
})();

// onDirectParamNameChanged resolves pending entries
(function() {
    var api = fakeApi({ paramNames: {} });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    mapper.onDirectParamNameChanged('PID_MODE', 'Mode');
    assert(mapper._padEntries.length === 5, 'all 5 entries should be resolved');
    assert(mapper._pendingPadEntries.length === 0, 'no entries should remain pending');
    assert(mapper._modeParamId === 'PID_MODE', 'mode param should be tracked');
    assert(api.behaviors[9], 'pad 9 should have behavior after deferred resolve');
    assert(api.behaviors[5], 'pad 5 should have behavior after deferred resolve');
})();

// deferred resolution click sends correct value
(function() {
    var api = fakeApi({ paramNames: {} });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    mapper.onDirectParamNameChanged('PID_MODE', 'Mode');
    api.behaviors[5](); // pad 5: value=1, resolution=5
    assert(api.paramCalls[0].value === 1, 'deferred click should send raw value');
    assert(api.paramCalls[0].resolution === 5, 'deferred click should pass resolution');
})();

// onDirectParamNameChanged ignores unrelated names
(function() {
    var api = fakeApi({ paramNames: {} });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    mapper.onDirectParamNameChanged('PID_OTHER', 'Frequency');
    assert(mapper._pendingPadEntries.length === 5, 'unrelated name should not resolve pending entries');
    assert(mapper._padEntries.length === 0, 'no entries should be resolved');
})();

// onDirectParamNameChanged is no-op when no pending entries
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    var entriesBefore = mapper._padEntries.length;
    mapper.onDirectParamNameChanged('PID_MODE', 'Mode');
    assert(mapper._padEntries.length === entriesBefore, 'should not add duplicate entries');
})();

// selectedWhen multi-value: Mid pad highlights for MidSolo (value 3, normalized 0.75)
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    var paintsBefore = api.paints.length;
    mapper.onParamValueChanged('PID_MODE', 0.75); // MidSolo = 3/4
    var newPaints = api.paints.slice(paintsBefore);
    var pad5 = newPaints.filter(function(p) { return p.padIndex === 5; });
    assert(pad5.length > 0 && pad5[0].color === 21, 'Mid pad should highlight for MidSolo');
})();

// selectedWhen multi-value: Side pad highlights for SideSolo (value 4, normalized 1.0)
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    var paintsBefore = api.paints.length;
    mapper.onParamValueChanged('PID_MODE', 1.0); // SideSolo = 4/4
    var newPaints = api.paints.slice(paintsBefore);
    var pad6 = newPaints.filter(function(p) { return p.padIndex === 6; });
    assert(pad6.length > 0 && pad6[0].color === 21, 'Side pad should highlight for SideSolo');
})();

// Stereo pad does NOT highlight when mode = Mid
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    var paintsBefore = api.paints.length;
    mapper.onParamValueChanged('PID_MODE', 0.25); // Mid = 1/4
    var newPaints = api.paints.slice(paintsBefore);
    var pad9 = newPaints.filter(function(p) { return p.padIndex === 9; });
    assert(pad9.length > 0 && pad9[0].color === 1, 'Stereo pad should NOT highlight when Mid active');
})();

// _currentModeValue persists across deactivate/activate (instance caching)
(function() {
    var api1 = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api1);
    mapper.onParamValueChanged('PID_MODE', 0.25); // Mid
    assert(mapper._currentModeValue === 0.25, 'mode value should be set');
    mapper.deactivate();
    assert(mapper._currentModeValue === 0.25, 'mode value should persist after deactivate');
    // Re-activate with new API — should repaint from persisted value
    var api2 = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var paintsBefore = api2.paints.length;
    mapper.activate(api2);
    var newPaints = api2.paints.slice(paintsBefore);
    var pad5 = newPaints.filter(function(p) { return p.padIndex === 5; });
    assert(pad5.length > 0 && pad5[pad5.length - 1].color === 21, 'Mid pad should highlight after re-activate');
    var pad9 = newPaints.filter(function(p) { return p.padIndex === 9; });
    assert(pad9.length > 0 && pad9[pad9.length - 1].color === 1, 'Stereo pad should be deselected after re-activate');
})();

// ---- deferred param value tests ----

// onParamValueChanged buffers value when _modeParamId is null (deferred case)
(function() {
    var api = fakeApi({ paramNames: {} }); // no params resolved
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    assert(mapper._modeParamId === null, '_modeParamId should be null before resolution');
    var paintsBefore = api.paints.length;
    mapper.onParamValueChanged('PID_MODE', 0.5);
    assert(mapper._deferredParamValues['PID_MODE'] === 0.5, 'should buffer value in _deferredParamValues');
    assert(mapper._currentModeValue === -1, '_currentModeValue should remain -1');
    assert(api.paints.length === paintsBefore, 'should not repaint');
})();

// deferred value replayed when entries resolve via onDirectParamNameChanged
(function() {
    var api = fakeApi({ paramNames: {} });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    // Feed param value before resolution
    mapper.onParamValueChanged('PID_MODE', 0.5);
    assert(mapper._deferredParamValues['PID_MODE'] === 0.5, 'value should be deferred');
    // Now resolve the param name
    var paintsBefore = api.paints.length;
    mapper.onDirectParamNameChanged('PID_MODE', 'Mode');
    assert(mapper._modeParamId === 'PID_MODE', '_modeParamId should be set');
    assert(mapper._currentModeValue === 0.5, '_currentModeValue should be replayed from deferred');
    // Should repaint with the deferred value (last paint wins after initial deselected)
    var newPaints = api.paints.slice(paintsBefore);
    var pad6 = newPaints.filter(function(p) { return p.padIndex === 6; });
    assert(pad6.length > 0 && pad6[pad6.length - 1].color === 21, 'Side pad should highlight for deferred value 0.5');
})();

// non-deferred onParamValueChanged still works normally (immediate case)
(function() {
    var api = fakeApi({ paramNames: { 'PID_MODE': 'Mode' } });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    assert(mapper._modeParamId === 'PID_MODE', '_modeParamId should be set immediately');
    var paintsBefore = api.paints.length;
    mapper.onParamValueChanged('PID_MODE', 0.25);
    assert(mapper._currentModeValue === 0.25, '_currentModeValue should be updated');
    var newPaints = api.paints.slice(paintsBefore);
    var pad5 = newPaints.filter(function(p) { return p.padIndex === 5; });
    assert(pad5.length > 0 && pad5[0].color === 21, 'Mid pad should highlight normally');
})();

// deferred values cleared after _modeParamId is set
(function() {
    var api = fakeApi({ paramNames: {} });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    mapper.onParamValueChanged('PID_MODE', 0.5);
    mapper.onParamValueChanged('PID_OTHER', 0.3);
    mapper.onDirectParamNameChanged('PID_MODE', 'Mode');
    assert(Object.keys(mapper._deferredParamValues).length === 0, 'deferred values should be cleared after resolution');
})();

// deactivate clears deferred values
(function() {
    var api = fakeApi({ paramNames: {} });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    mapper.onParamValueChanged('PID_MODE', 0.5);
    mapper.deactivate();
    assert(Object.keys(mapper._deferredParamValues).length === 0, 'deferred values should be cleared on deactivate');
})();

// activate clears deferred values from previous activation
(function() {
    var api = fakeApi({ paramNames: {} });
    var mapper = new FrequalizerPadMapper();
    mapper.activate(api);
    mapper.onParamValueChanged('PID_MODE', 0.5);
    mapper.activate(api); // re-activate
    assert(Object.keys(mapper._deferredParamValues).length === 0, 'deferred values should be cleared on re-activate');
})();

process.exit(t.summary('FrequalizerPadMapper'));
