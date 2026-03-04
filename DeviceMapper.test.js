var DeviceMapperHW = require('./DeviceMapper');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeTwister() {
    var behaviors = {};
    var calls = [];
    var ledValues = {};
    var encoderColors = {};
    var brightnessValues = {};
    return {
        calls: calls,
        behaviors: behaviors,
        ledValues: ledValues,
        encoderColors: encoderColors,
        brightnessValues: brightnessValues,
        unlinkAll: function() {
            for (var k in behaviors) delete behaviors[k];
            calls.push('unlinkAll');
        },
        linkEncoderToBehavior: function(enc, turnCb, pressCb, color) {
            behaviors[enc] = { turn: turnCb, press: pressCb, color: color };
            calls.push({ method: 'linkEncoderToBehavior', encoder: enc, color: color });
        },
        setEncoderLED: function(enc, value) {
            ledValues[enc] = value;
            calls.push({ method: 'setEncoderLED', encoder: enc, value: value });
        },
        setEncoderColor: function(enc, r, g, b) {
            encoderColors[enc] = { r: r, g: g, b: b };
            calls.push({ method: 'setEncoderColor', encoder: enc, r: r, g: g, b: b });
        },
        setEncoderBrightness: function(enc, value) {
            brightnessValues[enc] = value;
            calls.push({ method: 'setEncoderBrightness', encoder: enc, value: value });
        },
        setEncoderOff: function(enc) {
            brightnessValues[enc] = 17;
            calls.push({ method: 'setEncoderOff', encoder: enc });
        }
    };
}

function fakeBitwig(directParamCalls, directParamIds, directParamNames) {
    return {
        getCursorDevice: function() {
            return {
                setDirectParameterValueNormalized: function(id, value, resolution) {
                    directParamCalls.push({ id: id, value: value, resolution: resolution });
                }
            };
        },
        getDirectParamIds: function() { return directParamIds || []; },
        getDirectParamName: function(id) { return (directParamNames && directParamNames[id]) || null; }
    };
}

function makeTwoBandMapping() {
    return {
        "TestDevice": [
            { color: { r: 255, g: 0, b: 0 },
              encoders: [
                  { encoder: 1, paramId: 'CONTENTS/PIDaaa' },
                  { encoder: 5, paramId: 'CONTENTS/PIDbbb' },
              ],
              buttons: [
                  { encoder: 5, paramId: 'CONTENTS/PIDccc' },
              ]},
            { color: { r: 0, g: 255, b: 0 },
              encoders: [
                  { encoder: 2, paramId: 'CONTENTS/PIDddd' },
              ],
              buttons: []}
        ],
        "FixedValueDevice": [
            { color: { r: 255, g: 0, b: 0 },
              encoders: [
                  { encoder: 1, paramId: 'CONTENTS/PIDfreq1' },
              ],
              buttons: [
                  { encoder: 1, paramId: 'CONTENTS/PIDsolo', value: 1, releaseValue: 0, resolution: 19 },
              ]},
            { color: { r: 0, g: 255, b: 0 },
              encoders: [
                  { encoder: 2, paramId: 'CONTENTS/PIDfreq2' },
              ],
              buttons: [
                  { encoder: 2, paramId: 'CONTENTS/PIDsolo', value: 2, releaseValue: 0, resolution: 19 },
              ]}
        ]
    };
}

function fakeHost() {
    var notifications = [];
    return {
        notifications: notifications,
        showPopupNotification: function(msg) { notifications.push(msg); }
    };
}

function makeMapper(opts) {
    opts = opts || {};
    var directParamCalls = opts.directParamCalls || [];
    return new DeviceMapperHW({
        twister: opts.twister || fakeTwister(),
        bitwig: opts.bitwig || fakeBitwig(directParamCalls),
        host: opts.host || null,
        deviceMappings: opts.deviceMappings || makeTwoBandMapping(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// hasMapping returns true for mapped device
(function() {
    var mapper = makeMapper();
    assert(mapper.hasMapping("TestDevice") === true, "should return true for mapped device");
})();

// hasMapping returns false for unknown device
(function() {
    var mapper = makeMapper();
    assert(mapper.hasMapping("UnknownPlugin") === false, "should return false for unknown device");
})();

// applyMapping calls unlinkAll first
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    assert(tw.calls[0] === 'unlinkAll', "first call should be unlinkAll");
})();

// applyMapping links correct number of encoders
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    // 3 unique encoders: 1 (turn only), 5 (turn+press merged), 2 (turn only)
    var linkCalls = tw.calls.filter(function(c) { return c.method === 'linkEncoderToBehavior'; });
    assert(linkCalls.length === 3, "should link 3 encoders, got " + linkCalls.length);
})();

// applyMapping sets correct colors per band
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    // Encoder 1 is in band 1 (red)
    assert(tw.behaviors[1].color.r === 255 && tw.behaviors[1].color.g === 0, "encoder 1 should be red");
    // Encoder 2 is in band 2 (green)
    assert(tw.behaviors[2].color.r === 0 && tw.behaviors[2].color.g === 255, "encoder 2 should be green");
    // Encoder 5 is in band 1 (red) — first assignment wins for color
    assert(tw.behaviors[5].color.r === 255, "encoder 5 should be red (from band 1)");
})();

// turn callback sends correct paramId/value/resolution
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.applyMapping("TestDevice");
    // Turn encoder 1 (Q2: Frequency = PIDaaa)
    tw.behaviors[1].turn(64);
    assert(directParamCalls.length === 1, "turning encoder should call setDirectParameterValueNormalized");
    assert(directParamCalls[0].id === 'CONTENTS/PIDaaa', "should target correct paramId");
    assert(directParamCalls[0].value === 64, "value should be raw MIDI");
    assert(directParamCalls[0].resolution === 128, "resolution should be 128");
})();

// press callback toggles on press, ignores release
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.applyMapping("TestDevice");
    // Encoder 5 has press callback (PIDccc)
    assert(tw.behaviors[5].press !== null, "encoder 5 should have press callback");
    // Release should be ignored
    tw.behaviors[5].press(false);
    assert(directParamCalls.length === 0, "release should be ignored");
    // Press should toggle from 0 to 127
    tw.behaviors[5].press(true);
    assert(directParamCalls.length === 1, "press should call setDirectParameterValueNormalized");
    assert(directParamCalls[0].id === 'CONTENTS/PIDccc', "should target press paramId");
    assert(directParamCalls[0].value === 127, "should toggle from 0 to 127");
})();

// press callback toggles off when value is >= 0.5
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.applyMapping("TestDevice");
    // Simulate param currently at 1.0 (on)
    mapper.onParamValueChanged('CONTENTS/PIDccc', 1.0);
    tw.behaviors[5].press(true);
    assert(directParamCalls[0].value === 0, "should toggle from on to off (send 0)");
})();

// press callback updates local state for responsive rapid toggling
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.applyMapping("TestDevice");
    // First press: 0 -> 127
    tw.behaviors[5].press(true);
    assert(directParamCalls[0].value === 127, "first press should turn on");
    // Second press: should read optimistic local value (127/127=1.0 >= 0.5) -> 0
    tw.behaviors[5].press(true);
    assert(directParamCalls[1].value === 0, "second press should turn off via optimistic state");
})();

// shared encoder gets both turn and press callbacks
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    // Encoder 5 has turn (PIDbbb) and press (PIDccc)
    assert(tw.behaviors[5].turn !== null, "shared encoder should have turn callback");
    assert(tw.behaviors[5].press !== null, "shared encoder should have press callback");
    // Encoder 1 has only turn
    assert(tw.behaviors[1].turn !== null, "encoder 1 should have turn callback");
    assert(tw.behaviors[1].press === null, "encoder 1 should not have press callback");
})();

// applyMapping for unknown device does nothing
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("NonExistentDevice");
    assert(tw.calls.length === 0, "unknown device should not trigger any calls");
})();

// clearParamValues resets tracked state
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.onParamValueChanged('CONTENTS/PIDccc', 1.0);
    mapper.clearParamValues();
    mapper.applyMapping("TestDevice");
    // After clear, value should be treated as 0 (default)
    tw.behaviors[5].press(true);
    assert(directParamCalls[0].value === 127, "after clear, should toggle from 0 to 127");
})();

// onParamValueChanged stores normalized values
(function() {
    var mapper = makeMapper();
    mapper.onParamValueChanged('test/param', 0.75);
    assert(mapper._paramValues['test/param'] === 0.75, "should store normalized value");
})();

// applyMapping sets initial LED from tracked param values
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    // Pre-populate param values (as if Bitwig reported them before mapping applied)
    mapper.onParamValueChanged('CONTENTS/PIDaaa', 0.5);
    mapper.onParamValueChanged('CONTENTS/PIDbbb', 1.0);
    mapper.applyMapping("TestDevice");
    assert(tw.ledValues[1] === 64, "encoder 1 LED should be set to 64 (0.5 * 127 rounded), got " + tw.ledValues[1]);
    assert(tw.ledValues[5] === 127, "encoder 5 LED should be set to 127 (1.0 * 127), got " + tw.ledValues[5]);
    // Encoder 2 had no prior value, so no LED call
    assert(tw.ledValues[2] === undefined, "encoder 2 LED should not be set (no prior value)");
})();

// onParamValueChanged updates encoder LED when mapping is active
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    // Now change a param that's mapped to encoder 1
    mapper.onParamValueChanged('CONTENTS/PIDaaa', 0.75);
    assert(tw.ledValues[1] === 95, "encoder 1 LED should update to 95 (0.75 * 127 rounded), got " + tw.ledValues[1]);
})();

// onParamValueChanged does nothing when no active mapping for that param
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    // No applyMapping called — no active param-to-encoder lookup
    mapper.onParamValueChanged('CONTENTS/PIDaaa', 0.5);
    assert(Object.keys(tw.ledValues).length === 0, "should not set any LED when no mapping is active");
})();

// clearParamValues also clears active param-to-encoder lookup
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper.clearParamValues();
    // After clearing, onParamValueChanged should not update LEDs
    mapper.onParamValueChanged('CONTENTS/PIDaaa', 0.5);
    assert(Object.keys(tw.ledValues).length === 0, "should not set LED after clearParamValues");
})();

// hold button sends exact value and resolution on press
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.applyMapping("FixedValueDevice");
    tw.behaviors[1].press(true);
    assert(directParamCalls.length === 1, "press should send one call");
    assert(directParamCalls[0].id === 'CONTENTS/PIDsolo', "should target solo paramId");
    assert(directParamCalls[0].value === 1, "should send value 1 for band 1");
    assert(directParamCalls[0].resolution === 19, "should send resolution 19");
})();

// hold button for band 2 sends value 2
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.applyMapping("FixedValueDevice");
    tw.behaviors[2].press(true);
    assert(directParamCalls[0].value === 2, "should send value 2 for band 2");
    assert(directParamCalls[0].resolution === 19, "should send resolution 19");
})();

// hold button sends releaseValue on release
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.applyMapping("FixedValueDevice");
    tw.behaviors[1].press(true);
    tw.behaviors[1].press(false);
    assert(directParamCalls.length === 2, "should have press and release calls");
    assert(directParamCalls[1].value === 0, "release should send releaseValue 0 (no solo)");
    assert(directParamCalls[1].resolution === 19, "release should use same resolution");
})();

// hold button always sends same value (no toggle)
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.applyMapping("FixedValueDevice");
    tw.behaviors[1].press(true);
    tw.behaviors[1].press(false);
    tw.behaviors[1].press(true);
    assert(directParamCalls[0].value === 1, "first press sends value 1");
    assert(directParamCalls[2].value === 1, "second press still sends value 1 (no toggle)");
})();

// applyGenericMapping calls unlinkAll and links params sequentially
(function() {
    var tw = fakeTwister();
    var paramIds = ['PARAM/A', 'PARAM/B', 'PARAM/C'];
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], paramIds) });
    mapper.applyGenericMapping();
    assert(tw.calls[0] === 'unlinkAll', "first call should be unlinkAll");
    var linkCalls = tw.calls.filter(function(c) { return c.method === 'linkEncoderToBehavior'; });
    assert(linkCalls.length === 3, "should link 3 encoders for 3 params, got " + linkCalls.length);
    assert(linkCalls[0].encoder === 1, "first param should map to encoder 1");
    assert(linkCalls[1].encoder === 2, "second param should map to encoder 2");
    assert(linkCalls[2].encoder === 3, "third param should map to encoder 3");
})();

// applyGenericMapping clears encoders even when no params available
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], []) });
    mapper.applyGenericMapping();
    assert(tw.calls[0] === 'unlinkAll', "should call unlinkAll even with empty params");
    var linkCalls = tw.calls.filter(function(c) { return c.method === 'linkEncoderToBehavior'; });
    assert(linkCalls.length === 0, "should not link any encoders with empty params");
})();

// applyGenericMapping limits to 16 encoders
(function() {
    var tw = fakeTwister();
    var paramIds = [];
    for (var i = 0; i < 20; i++) paramIds.push('PARAM/' + i);
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], paramIds) });
    mapper.applyGenericMapping();
    var linkCalls = tw.calls.filter(function(c) { return c.method === 'linkEncoderToBehavior'; });
    assert(linkCalls.length === 16, "should only link 16 encoders max, got " + linkCalls.length);
})();

// applyGenericMapping turn callback sends correct paramId
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var paramIds = ['PARAM/Freq', 'PARAM/Gain'];
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls, bitwig: fakeBitwig(directParamCalls, paramIds) });
    mapper.applyGenericMapping();
    tw.behaviors[1].turn(100);
    assert(directParamCalls.length === 1, "should call setDirectParameterValueNormalized");
    assert(directParamCalls[0].id === 'PARAM/Freq', "should target first param");
    assert(directParamCalls[0].value === 100, "should pass value");
    assert(directParamCalls[0].resolution === 128, "should use resolution 128");
    tw.behaviors[2].turn(50);
    assert(directParamCalls[1].id === 'PARAM/Gain', "should target second param");
})();

// applyGenericMapping uses blue color (slightly shifted to avoid Twister index 0)
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], ['PARAM/A']) });
    mapper.applyGenericMapping();
    assert(tw.behaviors[1].color.r === 0 && tw.behaviors[1].color.g === 50 && tw.behaviors[1].color.b === 255,
        "generic mapping should use blue color (0, 50, 255)");
})();

// applyGenericMapping sets initial LEDs from tracked param values
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], ['PARAM/A', 'PARAM/B']) });
    mapper.onParamValueChanged('PARAM/A', 0.5);
    mapper.applyGenericMapping();
    assert(tw.ledValues[1] === 64, "encoder 1 LED should reflect tracked value, got " + tw.ledValues[1]);
    assert(tw.ledValues[2] === undefined, "encoder 2 LED should not be set (no prior value)");
})();

// applyGenericMapping LED feedback works via onParamValueChanged
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], ['PARAM/A', 'PARAM/B']) });
    mapper.applyGenericMapping();
    mapper.onParamValueChanged('PARAM/A', 0.75);
    assert(tw.ledValues[1] === 95, "encoder 1 LED should update to 95, got " + tw.ledValues[1]);
})();

// applyGenericMapping sets press callbacks that show param name growl
(function() {
    var tw = fakeTwister();
    var h = fakeHost();
    var paramNames = { 'PARAM/A': 'Frequency' };
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], ['PARAM/A'], paramNames), host: h });
    mapper.applyGenericMapping();
    assert(tw.behaviors[1].press !== null, "generic mapping should set press callback");
    tw.behaviors[1].press(true);
    assert(h.notifications.length === 1, "press should show notification");
    assert(h.notifications[0] === 'Frequency', 'notification should be param name "Frequency", got "' + h.notifications[0] + '"');
})();

// applyGenericMapping press callback ignores release
(function() {
    var tw = fakeTwister();
    var h = fakeHost();
    var paramNames = { 'PARAM/A': 'Frequency' };
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], ['PARAM/A'], paramNames), host: h });
    mapper.applyGenericMapping();
    tw.behaviors[1].press(false);
    assert(h.notifications.length === 0, "release should not show notification");
})();

// onDirectParamsChanged re-applies generic mapping when in generic mode
(function() {
    var tw = fakeTwister();
    var paramIds = [];
    var bw = fakeBitwig([], paramIds);
    var mapper = makeMapper({ twister: tw, bitwig: bw });
    // Apply generic with empty params (simulates name arriving before params)
    mapper.applyGenericMapping();
    var callsAfterFirst = tw.calls.length;
    // Now params arrive
    paramIds.push('PARAM/A', 'PARAM/B');
    mapper.onDirectParamsChanged();
    var linkCalls = tw.calls.filter(function(c) { return c.method === 'linkEncoderToBehavior'; });
    assert(linkCalls.length === 2, "should link 2 encoders after params arrive, got " + linkCalls.length);
})();

// onDirectParamsChanged does nothing when not in generic mode
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], ['PARAM/A']) });
    // Don't call applyGenericMapping — not in generic mode
    mapper.onDirectParamsChanged();
    assert(tw.calls.length === 0, "should not do anything when not in generic mode");
})();

// onDirectParamsChanged does nothing after applyMapping (custom device)
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], ['PARAM/A']) });
    mapper.applyGenericMapping(); // enter generic mode
    mapper.applyMapping("TestDevice"); // switch to custom mapping
    var callsAfterMapping = tw.calls.length;
    mapper.onDirectParamsChanged();
    assert(tw.calls.length === callsAfterMapping, "should not re-apply after switching to custom mapping");
})();

// applyGenericMapping after applyMapping clears custom mode and enters generic
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], ['PARAM/A', 'PARAM/B']) });
    mapper.applyMapping("TestDevice");
    mapper.applyGenericMapping();
    var linkCalls = tw.calls.filter(function(c) { return c.method === 'linkEncoderToBehavior'; });
    // TestDevice has 3 encoders + generic has 2 = 5 total
    assert(linkCalls.length === 5, "should have both custom and generic link calls");
    // After re-apply, onDirectParamsChanged should work
    mapper.onDirectParamsChanged();
    var linkCallsAfter = tw.calls.filter(function(c) { return c.method === 'linkEncoderToBehavior'; });
    assert(linkCallsAfter.length === 7, "onDirectParamsChanged should re-apply generic, got " + linkCallsAfter.length);
})();

// ---- band active/inactive brightness tests ----

// inactive band (value 0) calls setEncoderOff for band encoders
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper.onParamValueChanged('CONTENTS/PIDccc', 0);
    assert(tw.brightnessValues[1] === 17, "encoder 1 should be off (brightness 17) when band is inactive");
    assert(tw.brightnessValues[5] === 17, "encoder 5 should be off (brightness 17) when band is inactive");
})();

// re-activated band (value 1) sets brightness 47 on all band encoders
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper.onParamValueChanged('CONTENTS/PIDccc', 0);
    mapper.onParamValueChanged('CONTENTS/PIDccc', 1);
    assert(tw.brightnessValues[1] === 47, "encoder 1 should be full brightness when band is re-activated");
    assert(tw.brightnessValues[5] === 47, "encoder 5 should be full brightness when band is re-activated");
})();

// band without active toggle has no brightness calls
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    var brightnessCalls = tw.calls.filter(function(c) {
        return (c.method === 'setEncoderBrightness' || c.method === 'setEncoderOff') && c.encoder === 2;
    });
    assert(brightnessCalls.length === 0, "encoder 2 should have no brightness calls (no active toggle)");
    assert(tw.behaviors[2].color.r === 0 && tw.behaviors[2].color.g === 255,
        "encoder 2 should retain green band color");
})();

// active param change only affects its own band's encoders
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper.onParamValueChanged('CONTENTS/PIDccc', 0);
    assert(tw.brightnessValues[2] === undefined, "encoder 2 brightness should not be affected by band 1 active change");
})();

// applyMapping with pre-existing inactive value sets brightness off after linking
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.onParamValueChanged('CONTENTS/PIDccc', 0);
    mapper.applyMapping("TestDevice");
    assert(tw.brightnessValues[1] === 17, "encoder 1 should be off when pre-existing inactive");
    assert(tw.brightnessValues[5] === 17, "encoder 5 should be off when pre-existing inactive");
    // Color should still be band color (not black)
    assert(tw.behaviors[1].color.r === 255 && tw.behaviors[1].color.g === 0,
        "encoder 1 should still have band color when pre-existing inactive");
})();

// applyMapping with pre-existing active value sets brightness 47 after linking
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.onParamValueChanged('CONTENTS/PIDccc', 1);
    mapper.applyMapping("TestDevice");
    assert(tw.brightnessValues[1] === 47, "encoder 1 should be full brightness when pre-existing active");
    assert(tw.brightnessValues[5] === 47, "encoder 5 should be full brightness when pre-existing active");
})();

// applyMapping with unknown active state defaults to brightness 47 (active)
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    assert(tw.brightnessValues[1] === 47, "encoder 1 should default to full brightness when active state unknown");
    assert(tw.brightnessValues[5] === 47, "encoder 5 should default to full brightness when active state unknown");
    // Color should always be band color
    assert(tw.behaviors[1].color.r === 255 && tw.behaviors[1].color.g === 0,
        "encoder 1 should always use band color");
})();

// FixedValueDevice has no brightness calls (no active toggles)
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("FixedValueDevice");
    var brightnessCalls = tw.calls.filter(function(c) {
        return c.method === 'setEncoderBrightness' || c.method === 'setEncoderOff';
    });
    assert(brightnessCalls.length === 0, "FixedValueDevice should have no brightness calls");
    assert(tw.behaviors[1].color.r === 255 && tw.behaviors[1].color.g === 0,
        "FixedValueDevice encoder 1 should show band color (red)");
    assert(tw.behaviors[2].color.r === 0 && tw.behaviors[2].color.g === 255,
        "FixedValueDevice encoder 2 should show band color (green)");
})();

// clearParamValues resets tracking — no brightness calls after clear
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper.clearParamValues();
    var callsBefore = tw.calls.length;
    mapper.onParamValueChanged('CONTENTS/PIDccc', 0);
    var newCalls = tw.calls.slice(callsBefore);
    var brightnessCalls = newCalls.filter(function(c) {
        return c.method === 'setEncoderBrightness' || c.method === 'setEncoderOff';
    });
    assert(brightnessCalls.length === 0, "should not set brightness after clearParamValues");
})();

// threshold: 0.5 = brightness 47, 0.49 = off
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper.onParamValueChanged('CONTENTS/PIDccc', 0.5);
    assert(tw.brightnessValues[1] === 47, "value 0.5 should be active (brightness 47)");
    mapper.onParamValueChanged('CONTENTS/PIDccc', 0.49);
    assert(tw.brightnessValues[1] === 17, "value 0.49 should be inactive (brightness 17 / off)");
})();

// ---- toggle press brightness tests ----

// active toggle press (off→on) sets brightness 47 on all band encoders
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper._paramValues['CONTENTS/PIDccc'] = 0;
    var callsBefore = tw.calls.length;
    tw.behaviors[5].press(true);
    var newCalls = tw.calls.slice(callsBefore);
    var brightCalls = newCalls.filter(function(c) { return c.method === 'setEncoderBrightness'; });
    assert(brightCalls.length === 2, "should call setEncoderBrightness on both band encoders, got " + brightCalls.length);
    assert(brightCalls[0].encoder === 1 && brightCalls[0].value === 47, "encoder 1 should get brightness 47");
    assert(brightCalls[1].encoder === 5 && brightCalls[1].value === 47, "encoder 5 should get brightness 47");
    // Should not re-send color (color already set by linkEncoderToBehavior)
    var colorCalls = newCalls.filter(function(c) { return c.method === 'setEncoderColor'; });
    assert(colorCalls.length === 0, "should not re-send color on activation");
})();

// active toggle press (on→off) calls setEncoderOff on all band encoders
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper._paramValues['CONTENTS/PIDccc'] = 1;
    var callsBefore = tw.calls.length;
    tw.behaviors[5].press(true);
    var newCalls = tw.calls.slice(callsBefore);
    var offCalls = newCalls.filter(function(c) { return c.method === 'setEncoderOff'; });
    assert(offCalls.length === 2, "should call setEncoderOff on both band encoders, got " + offCalls.length);
    assert(offCalls[0].encoder === 1 || offCalls[1].encoder === 1, "encoder 1 should be turned off");
    assert(offCalls[0].encoder === 5 || offCalls[1].encoder === 5, "encoder 5 should be turned off");
})();

// ---- param ID normalization tests ----

// onParamValueChanged strips ROOT_GENERIC_MODULE/ prefix and stores under short-form key
(function() {
    var mapper = makeMapper();
    mapper.onParamValueChanged('CONTENTS/ROOT_GENERIC_MODULE/PIDaaa', 0.75);
    assert(mapper._paramValues['CONTENTS/PIDaaa'] === 0.75,
        "should store value under normalized key (without ROOT_GENERIC_MODULE/)");
    assert(mapper._paramValues['CONTENTS/ROOT_GENERIC_MODULE/PIDaaa'] === undefined,
        "should not store value under long-form key");
})();

// onParamValueChanged with long-form ID updates encoder LED when mapping is active
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    // Observer reports long-form ID, but encoder 1 is mapped to short-form CONTENTS/PIDaaa
    mapper.onParamValueChanged('CONTENTS/ROOT_GENERIC_MODULE/PIDaaa', 0.75);
    assert(tw.ledValues[1] === 95,
        "encoder 1 LED should update via normalized ID, got " + tw.ledValues[1]);
})();

// onParamValueChanged with long-form ID updates band brightness
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    // Observer reports long-form ID for band active param (PIDccc)
    mapper.onParamValueChanged('CONTENTS/ROOT_GENERIC_MODULE/PIDccc', 0);
    assert(tw.brightnessValues[1] === 17,
        "encoder 1 should be off via normalized band active ID");
    assert(tw.brightnessValues[5] === 17,
        "encoder 5 should be off via normalized band active ID");
})();

// onParamValueChanged with long-form ID restores band brightness
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper.onParamValueChanged('CONTENTS/ROOT_GENERIC_MODULE/PIDccc', 0);
    mapper.onParamValueChanged('CONTENTS/ROOT_GENERIC_MODULE/PIDccc', 1);
    assert(tw.brightnessValues[1] === 47,
        "encoder 1 should restore brightness via normalized ID");
    assert(tw.brightnessValues[5] === 47,
        "encoder 5 should restore brightness via normalized ID");
})();

// toggle reads normalized param value after observer update with long-form ID
(function() {
    var directParamCalls = [];
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, directParamCalls: directParamCalls });
    mapper.applyMapping("TestDevice");
    // Observer reports long-form, storing under short-form key
    mapper.onParamValueChanged('CONTENTS/ROOT_GENERIC_MODULE/PIDccc', 1.0);
    // Toggle press reads _paramValues[short-form] — should see 1.0 and toggle off
    tw.behaviors[5].press(true);
    assert(directParamCalls[0].value === 0,
        "toggle should read normalized param value and turn off, got " + directParamCalls[0].value);
})();

// IDs without ROOT_GENERIC_MODULE/ prefix pass through unchanged
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw });
    mapper.applyMapping("TestDevice");
    mapper.onParamValueChanged('CONTENTS/PIDaaa', 0.5);
    assert(tw.ledValues[1] === 64,
        "short-form ID should still work, got " + tw.ledValues[1]);
    assert(mapper._paramValues['CONTENTS/PIDaaa'] === 0.5,
        "short-form ID should store correctly");
})();

// resetGenericMode clears _genericMode without affecting param values
(function() {
    var tw = fakeTwister();
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], ['PARAM/A']) });
    mapper.applyGenericMapping(); // sets _genericMode = true
    mapper.onParamValueChanged('PARAM/A', 0.5);
    mapper.resetGenericMode();
    assert(mapper._genericMode === false, "_genericMode should be false after resetGenericMode");
    assert(mapper._paramValues['PARAM/A'] === 0.5, "param values should be preserved");
})();

// onDirectParamsChanged is no-op after resetGenericMode
(function() {
    var tw = fakeTwister();
    var paramIds = ['PARAM/A'];
    var mapper = makeMapper({ twister: tw, bitwig: fakeBitwig([], paramIds) });
    mapper.applyGenericMapping(); // sets _genericMode = true
    var callsBefore = tw.calls.length;
    mapper.resetGenericMode();
    mapper.onDirectParamsChanged();
    assert(tw.calls.length === callsBefore, "onDirectParamsChanged should be no-op after resetGenericMode");
})();

process.exit(t.summary('DeviceMapper'));
