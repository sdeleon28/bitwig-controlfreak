var t = require('./test-assert');
var assert = t.assert;
var FrequalizerDevice = require('./FrequalizerDevice');
var twisterNs = require('./TwisterPainter');
var TwisterPalette = twisterNs.TwisterPalette;
var TwisterPainter = twisterNs.TwisterPainter;

// Make globals available for FrequalizerTwisterMapper (it references them directly)
global.FrequalizerDevice = FrequalizerDevice;
global.TwisterPalette = TwisterPalette;

var FrequalizerTwisterMapper = require('./FrequalizerTwisterMapper');

var PARAM_IDS = FrequalizerDevice.PARAM_IDS;
var Band = FrequalizerDevice.Band;
var Mode = FrequalizerDevice.Mode;

// ---- helpers ----

function fakeMidiOutput() {
    var msgs = [];
    return {
        messages: msgs,
        sendMidi: function(status, data1, data2) {
            msgs.push({ status: status, data1: data1, data2: data2 });
        }
    };
}

function makeMapper() {
    var out = fakeMidiOutput();
    var device = new FrequalizerDevice();
    var painter = new TwisterPainter({ midiOutput: out });
    var mapper = new FrequalizerTwisterMapper({ device: device, painter: painter });
    return { mapper: mapper, output: out };
}

function colorMessages(msgs) {
    return msgs.filter(function(m) { return m.status === 0xB1; });
}

// ---- band active LED tests ----

var bandTests = [
    { name: 'Lowest',    activeId: PARAM_IDS.Q1_ACTIVE, encoders: [13, 14],    color: TwisterPalette.blue1 },
    { name: 'Highest',   activeId: PARAM_IDS.Q6_ACTIVE, encoders: [15, 16],    color: TwisterPalette.red7 },
    { name: 'Low',       activeId: PARAM_IDS.Q2_ACTIVE, encoders: [1, 5, 9],   color: TwisterPalette.red1 },
    { name: 'Low Mids',  activeId: PARAM_IDS.Q3_ACTIVE, encoders: [2, 6, 10],  color: TwisterPalette.green2 },
    { name: 'High Mids', activeId: PARAM_IDS.Q4_ACTIVE, encoders: [3, 7, 11],  color: TwisterPalette.orange2 },
    { name: 'High',      activeId: PARAM_IDS.Q5_ACTIVE, encoders: [4, 8, 12],  color: TwisterPalette.yellow11 },
];

for (var bi = 0; bi < bandTests.length; bi++) {
    // activating band paints its encoders with the correct color
    (function(bt) {
        var s = makeMapper();
        s.mapper.feed(bt.activeId, 1.0);
        // paint sends 2 messages per encoder (color + brightness)
        var expected = bt.encoders.length * 2;
        assert(s.output.messages.length === expected,
            bt.name + ' active sends ' + expected + ' messages, got ' + s.output.messages.length);
        var colors = colorMessages(s.output.messages);
        for (var i = 0; i < colors.length; i++) {
            assert(colors[i].data2 === bt.color,
                bt.name + ' encoder ' + bt.encoders[i] + ' gets color ' + bt.color);
        }
    })(bandTests[bi]);

    // deactivating band turns off its encoders
    (function(bt) {
        var s = makeMapper();
        s.mapper.feed(bt.activeId, 0.0);
        // off sends 1 message per encoder (brightness only)
        assert(s.output.messages.length === bt.encoders.length,
            bt.name + ' inactive sends ' + bt.encoders.length + ' messages, got ' + s.output.messages.length);
        for (var i = 0; i < s.output.messages.length; i++) {
            assert(s.output.messages[i].status === 0xB2, bt.name + ' off msg ' + i + ' is brightness');
            assert(s.output.messages[i].data2 === 17, bt.name + ' off msg ' + i + ' brightness is 17');
        }
    })(bandTests[bi]);
}

// ---- handleClick tests ----

var clickTests = [
    { encoder: 9,  paramId: PARAM_IDS.Q2_ACTIVE, activeId: PARAM_IDS.Q2_ACTIVE, name: 'Low' },
    { encoder: 10, paramId: PARAM_IDS.Q3_ACTIVE, activeId: PARAM_IDS.Q3_ACTIVE, name: 'Low Mids' },
    { encoder: 11, paramId: PARAM_IDS.Q4_ACTIVE, activeId: PARAM_IDS.Q4_ACTIVE, name: 'High Mids' },
    { encoder: 12, paramId: PARAM_IDS.Q5_ACTIVE, activeId: PARAM_IDS.Q5_ACTIVE, name: 'High' },
    { encoder: 13, paramId: PARAM_IDS.Q1_ACTIVE, activeId: PARAM_IDS.Q1_ACTIVE, name: 'Lowest' },
    { encoder: 15, paramId: PARAM_IDS.Q6_ACTIVE, activeId: PARAM_IDS.Q6_ACTIVE, name: 'Highest' },
];

for (var ci = 0; ci < clickTests.length; ci++) {
    // handleClick returns toggle to active when band is inactive (default)
    (function(ct) {
        var s = makeMapper();
        var result = s.mapper.handleClick(ct.encoder);
        assert(result !== null, ct.name + ': encoder ' + ct.encoder + ' returns a toggle');
        assert(result.paramId === ct.paramId, ct.name + ': paramId is ' + ct.paramId);
        assert(result.value === 1, ct.name + ': default toggles to active (1)');
        assert(result.resolution === 2, ct.name + ': resolution is 2');
    })(clickTests[ci]);

    // handleClick returns toggle to inactive after band is activated
    (function(ct) {
        var s = makeMapper();
        s.mapper.feed(ct.activeId, 1.0);
        var result = s.mapper.handleClick(ct.encoder);
        assert(result !== null, ct.name + ': encoder ' + ct.encoder + ' returns a toggle after active');
        assert(result.paramId === ct.paramId, ct.name + ': paramId is ' + ct.paramId);
        assert(result.value === 0, ct.name + ': active toggles to inactive (0)');
        assert(result.resolution === 2, ct.name + ': resolution is 2');
    })(clickTests[ci]);
}

// handleClick on unmapped encoder returns null
(function() {
    var s = makeMapper();
    var result = s.mapper.handleClick(14);
    assert(result === null, 'encoder 14 returns null');
    result = s.mapper.handleClick(1);
    assert(result === null, 'encoder 1 (turn-only) returns null');
})();

// feeding an unrecognized param returns false and produces no painter calls
(function() {
    var s = makeMapper();
    var result = s.mapper.feed('CONTENTS/UNKNOWN', 0.5);
    assert(result === false, 'unknown param returns false');
    assert(s.output.messages.length === 0, 'unknown param produces no output');
})();

// ---- handleHold solo tests ----

var soloTests = [
    { encoder: 5, soloStep: 2, name: 'Low' },
    { encoder: 6, soloStep: 3, name: 'LowMids' },
    { encoder: 7, soloStep: 4, name: 'HighMids' },
    { encoder: 8, soloStep: 5, name: 'High' },
];

for (var si = 0; si < soloTests.length; si++) {
    // handleHold press returns solo step for BAND_SOLO
    (function(st) {
        var s = makeMapper();
        var result = s.mapper.handleHold(st.encoder, true);
        assert(result !== null, st.name + ': encoder ' + st.encoder + ' press returns a hold action');
        assert(result.paramId === PARAM_IDS.BAND_SOLO, st.name + ': paramId is BAND_SOLO');
        assert(result.value === st.soloStep, st.name + ': press value is ' + st.soloStep);
        assert(result.resolution === 19, st.name + ': resolution is 19');
    })(soloTests[si]);

    // handleHold release returns 0 (unsolo)
    (function(st) {
        var s = makeMapper();
        var result = s.mapper.handleHold(st.encoder, false);
        assert(result !== null, st.name + ': encoder ' + st.encoder + ' release returns a hold action');
        assert(result.paramId === PARAM_IDS.BAND_SOLO, st.name + ': release paramId is BAND_SOLO');
        assert(result.value === 0, st.name + ': release value is 0');
        assert(result.resolution === 19, st.name + ': release resolution is 19');
    })(soloTests[si]);
}

// handleHold on unmapped encoder returns null
(function() {
    var s = makeMapper();
    assert(s.mapper.handleHold(13, true) === null, 'encoder 13 hold returns null');
    assert(s.mapper.handleHold(1, true) === null, 'encoder 1 hold returns null');
})();

// ---- solo light feedback tests ----

// solo a band → all 16 encoders off'd, then soloed band's encoders painted
(function() {
    var s = makeMapper();
    // activate Low and High first
    s.mapper.feed(PARAM_IDS.Q2_ACTIVE, 1.0);
    s.mapper.feed(PARAM_IDS.Q5_ACTIVE, 1.0);
    s.output.messages.length = 0;

    // solo Low
    s.mapper.feed(PARAM_IDS.BAND_SOLO, 2 / 18); // step 2 = Low
    var msgs = s.output.messages;

    // Should have 16 off messages + 3 paint messages (Low has 3 encoders, paint = 2 msgs each)
    var offMsgs = msgs.filter(function(m) { return m.status === 0xB2 && m.data2 === 17; });
    assert(offMsgs.length === 16, 'solo: all 16 encoders turned off, got ' + offMsgs.length);

    var paintColorMsgs = msgs.filter(function(m) { return m.status === 0xB1; });
    assert(paintColorMsgs.length === 3, 'solo: 3 color messages for Low band, got ' + paintColorMsgs.length);
    for (var i = 0; i < paintColorMsgs.length; i++) {
        assert(paintColorMsgs[i].data2 === TwisterPalette.red1,
            'solo: Low encoder gets red1 color');
    }
})();

// unsolo → all encoders repainted based on active state
(function() {
    var s = makeMapper();
    // activate Low and High
    s.mapper.feed(PARAM_IDS.Q2_ACTIVE, 1.0);
    s.mapper.feed(PARAM_IDS.Q5_ACTIVE, 1.0);

    // solo Low, then unsolo
    s.mapper.feed(PARAM_IDS.BAND_SOLO, 2 / 18);
    s.output.messages.length = 0;
    s.mapper.feed(PARAM_IDS.BAND_SOLO, 0); // unsolo

    var msgs = s.output.messages;

    // Low (3 encoders) and High (3 encoders) should be painted (2 msgs each = 12)
    // Other 10 encoders should be off'd (1 msg each = 10)
    var paintColorMsgs = msgs.filter(function(m) { return m.status === 0xB1; });
    assert(paintColorMsgs.length === 6, 'unsolo: 6 color messages (Low=3 + High=3), got ' + paintColorMsgs.length);

    var offMsgs = msgs.filter(function(m) { return m.status === 0xB2 && m.data2 === 17; });
    assert(offMsgs.length === 10, 'unsolo: 10 encoders turned off, got ' + offMsgs.length);
})();

// solo from cold state (no bands active) → only soloed band lights, unsolo → everything off
(function() {
    var s = makeMapper();
    s.output.messages.length = 0;

    // solo HighMids (step 4)
    s.mapper.feed(PARAM_IDS.BAND_SOLO, 4 / 18);
    var msgs = s.output.messages;

    var offMsgs = msgs.filter(function(m) { return m.status === 0xB2 && m.data2 === 17; });
    assert(offMsgs.length === 16, 'cold solo: all 16 encoders off\'d, got ' + offMsgs.length);

    var paintColorMsgs = msgs.filter(function(m) { return m.status === 0xB1; });
    assert(paintColorMsgs.length === 3, 'cold solo: 3 color msgs for HighMids, got ' + paintColorMsgs.length);
    for (var i = 0; i < paintColorMsgs.length; i++) {
        assert(paintColorMsgs[i].data2 === TwisterPalette.orange2,
            'cold solo: HighMids encoder gets orange2 color');
    }

    // unsolo → everything off (no bands were active)
    s.output.messages.length = 0;
    s.mapper.feed(PARAM_IDS.BAND_SOLO, 0);
    var unsoloMsgs = s.output.messages;
    var unsoloOff = unsoloMsgs.filter(function(m) { return m.status === 0xB2 && m.data2 === 17; });
    assert(unsoloOff.length === 16, 'cold unsolo: all 16 encoders off, got ' + unsoloOff.length);
    var unsoloPaint = unsoloMsgs.filter(function(m) { return m.status === 0xB1; });
    assert(unsoloPaint.length === 0, 'cold unsolo: no color messages, got ' + unsoloPaint.length);
})();

// ---- encoderParamId tests ----

var turnTests = [
    { encoder: 1,  param: PARAM_IDS.Q2_FREQ,    name: 'Q2 freq' },
    { encoder: 5,  param: PARAM_IDS.Q2_QUALITY,  name: 'Q2 Q' },
    { encoder: 9,  param: PARAM_IDS.Q2_GAIN,     name: 'Q2 gain' },
    { encoder: 2,  param: PARAM_IDS.Q3_FREQ,     name: 'Q3 freq' },
    { encoder: 6,  param: PARAM_IDS.Q3_QUALITY,  name: 'Q3 Q' },
    { encoder: 10, param: PARAM_IDS.Q3_GAIN,     name: 'Q3 gain' },
    { encoder: 3,  param: PARAM_IDS.Q4_FREQ,     name: 'Q4 freq' },
    { encoder: 7,  param: PARAM_IDS.Q4_QUALITY,  name: 'Q4 Q' },
    { encoder: 11, param: PARAM_IDS.Q4_GAIN,     name: 'Q4 gain' },
    { encoder: 4,  param: PARAM_IDS.Q5_FREQ,     name: 'Q5 freq' },
    { encoder: 8,  param: PARAM_IDS.Q5_QUALITY,  name: 'Q5 Q' },
    { encoder: 12, param: PARAM_IDS.Q5_GAIN,     name: 'Q5 gain' },
    { encoder: 13, param: PARAM_IDS.Q1_FREQ,     name: 'Q1 freq' },
    { encoder: 14, param: PARAM_IDS.Q1_QUALITY,  name: 'Q1 Q' },
    { encoder: 15, param: PARAM_IDS.Q6_FREQ,     name: 'Q6 freq' },
    { encoder: 16, param: PARAM_IDS.Q6_QUALITY,  name: 'Q6 Q' },
];

for (var ti = 0; ti < turnTests.length; ti++) {
    // encoderParamId returns the correct param ID for each mapped encoder
    (function(tt) {
        var s = makeMapper();
        var result = s.mapper.encoderParamId(tt.encoder);
        assert(result === tt.param,
            tt.name + ': encoder ' + tt.encoder + ' -> ' + tt.param + ', got ' + result);
    })(turnTests[ti]);
}

// encoderParamId returns null for unmapped encoder
(function() {
    var s = makeMapper();
    assert(s.mapper.encoderParamId(0) === null, 'encoder 0 returns null');
    assert(s.mapper.encoderParamId(99) === null, 'encoder 99 returns null');
})();

// ---- ring feedback tests ----

// feeding a mapped encoder param sends a ring message to the correct encoder
(function() {
    var s = makeMapper();
    var result = s.mapper.feed(PARAM_IDS.Q2_FREQ, 0.5);
    assert(result === true, 'mapped encoder param returns true');
    var ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 1, 'one ring message sent');
    // encoder 1 -> CC 12
    assert(ringMsgs[0].data1 === 12, 'Q2_FREQ -> encoder 1 -> CC 12');
    assert(ringMsgs[0].data2 === 64, '0.5 * 127 rounds to 64');
})();

// all 16 encoder params produce ring messages
(function() {
    var allEncoderParams = [
        { param: PARAM_IDS.Q2_FREQ,    encoder: 1 },
        { param: PARAM_IDS.Q3_FREQ,    encoder: 2 },
        { param: PARAM_IDS.Q4_FREQ,    encoder: 3 },
        { param: PARAM_IDS.Q5_FREQ,    encoder: 4 },
        { param: PARAM_IDS.Q2_QUALITY, encoder: 5 },
        { param: PARAM_IDS.Q3_QUALITY, encoder: 6 },
        { param: PARAM_IDS.Q4_QUALITY, encoder: 7 },
        { param: PARAM_IDS.Q5_QUALITY, encoder: 8 },
        { param: PARAM_IDS.Q2_GAIN,    encoder: 9 },
        { param: PARAM_IDS.Q3_GAIN,    encoder: 10 },
        { param: PARAM_IDS.Q4_GAIN,    encoder: 11 },
        { param: PARAM_IDS.Q5_GAIN,    encoder: 12 },
        { param: PARAM_IDS.Q1_FREQ,    encoder: 13 },
        { param: PARAM_IDS.Q1_QUALITY, encoder: 14 },
        { param: PARAM_IDS.Q6_FREQ,    encoder: 15 },
        { param: PARAM_IDS.Q6_QUALITY, encoder: 16 },
    ];
    for (var i = 0; i < allEncoderParams.length; i++) {
        var ep = allEncoderParams[i];
        var s = makeMapper();
        var result = s.mapper.feed(ep.param, 1.0);
        assert(result === true, 'encoder ' + ep.encoder + ' param returns true');
        var ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
        assert(ringMsgs.length === 1, 'encoder ' + ep.encoder + ' sends one ring message');
        assert(ringMsgs[0].data2 === 127, 'encoder ' + ep.encoder + ' value 1.0 -> 127');
    }
})();

// feeding an unmapped param still delegates to device
(function() {
    var s = makeMapper();
    var result = s.mapper.feed(PARAM_IDS.BAND_SOLO, 0.0);
    assert(result === true, 'BAND_SOLO delegates to device and returns true');
    var ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 0, 'BAND_SOLO produces no ring messages');
})();

// ---- hold-turn gesture tests ----

var holdTurnTests = [
    { band: 'Low',      holdButton: 1, encoder: 5, filterParam: PARAM_IDS.Q2_FILTER, defaultParam: PARAM_IDS.Q2_QUALITY },
    { band: 'LowMids',  holdButton: 2, encoder: 6, filterParam: PARAM_IDS.Q3_FILTER, defaultParam: PARAM_IDS.Q3_QUALITY },
    { band: 'HighMids', holdButton: 3, encoder: 7, filterParam: PARAM_IDS.Q4_FILTER, defaultParam: PARAM_IDS.Q4_QUALITY },
    { band: 'High',     holdButton: 4, encoder: 8, filterParam: PARAM_IDS.Q5_FILTER, defaultParam: PARAM_IDS.Q5_QUALITY },
];

for (var hi = 0; hi < holdTurnTests.length; hi++) {
    // hold freq button + turn quality encoder returns FILTER param
    (function(ht) {
        var s = makeMapper();
        s.mapper.notifyButtonState(ht.holdButton, true);
        var result = s.mapper.encoderParamId(ht.encoder);
        assert(result === ht.filterParam,
            ht.band + ': hold button ' + ht.holdButton + ' + encoder ' + ht.encoder + ' returns FILTER, got ' + result);
    })(holdTurnTests[hi]);

    // default (no hold) returns QUALITY param
    (function(ht) {
        var s = makeMapper();
        var result = s.mapper.encoderParamId(ht.encoder);
        assert(result === ht.defaultParam,
            ht.band + ': encoder ' + ht.encoder + ' default returns QUALITY, got ' + result);
    })(holdTurnTests[hi]);

    // release restores normal behavior
    (function(ht) {
        var s = makeMapper();
        s.mapper.notifyButtonState(ht.holdButton, true);
        s.mapper.notifyButtonState(ht.holdButton, false);
        var result = s.mapper.encoderParamId(ht.encoder);
        assert(result === ht.defaultParam,
            ht.band + ': encoder ' + ht.encoder + ' after release returns QUALITY, got ' + result);
    })(holdTurnTests[hi]);
}

// holding an unrelated button does not affect encoder 5
(function() {
    var s = makeMapper();
    s.mapper.notifyButtonState(2, true);
    var result = s.mapper.encoderParamId(5);
    assert(result === PARAM_IDS.Q2_QUALITY,
        'holding button 2 does not affect encoder 5, got ' + result);
})();

// ===========================================================================
// Mid mode tests
// ===========================================================================

function switchToMid(mapper) {
    mapper.feed(PARAM_IDS.MODE, 0.25); // step 1 = Mid
}

function switchToStereo(mapper) {
    mapper.feed(PARAM_IDS.MODE, 0.0); // step 0 = Stereo
}

function switchToSide(mapper) {
    mapper.feed(PARAM_IDS.MODE, 0.5); // step 2 = Side
}

// ---- mid encoder param ID tests ----

var midTurnTests = [
    { encoder: 1,  param: PARAM_IDS.Q8_FREQ,    name: 'Q8 freq' },
    { encoder: 5,  param: PARAM_IDS.Q8_QUALITY,  name: 'Q8 Q' },
    { encoder: 9,  param: PARAM_IDS.Q8_GAIN,     name: 'Q8 gain' },
    { encoder: 2,  param: PARAM_IDS.Q9_FREQ,     name: 'Q9 freq' },
    { encoder: 6,  param: PARAM_IDS.Q9_QUALITY,  name: 'Q9 Q' },
    { encoder: 10, param: PARAM_IDS.Q9_GAIN,     name: 'Q9 gain' },
    { encoder: 3,  param: PARAM_IDS.Q10_FREQ,    name: 'Q10 freq' },
    { encoder: 7,  param: PARAM_IDS.Q10_QUALITY, name: 'Q10 Q' },
    { encoder: 11, param: PARAM_IDS.Q10_GAIN,    name: 'Q10 gain' },
    { encoder: 4,  param: PARAM_IDS.Q11_FREQ,    name: 'Q11 freq' },
    { encoder: 8,  param: PARAM_IDS.Q11_QUALITY, name: 'Q11 Q' },
    { encoder: 12, param: PARAM_IDS.Q11_GAIN,    name: 'Q11 gain' },
    { encoder: 13, param: PARAM_IDS.Q7_FREQ,     name: 'Q7 freq' },
    { encoder: 14, param: PARAM_IDS.Q7_QUALITY,  name: 'Q7 Q' },
    { encoder: 15, param: PARAM_IDS.Q12_FREQ,    name: 'Q12 freq' },
    { encoder: 16, param: PARAM_IDS.Q12_QUALITY, name: 'Q12 Q' },
];

// mid mode: encoderParamId routes to Q7-Q12 param IDs
for (var mti = 0; mti < midTurnTests.length; mti++) {
    (function(tt) {
        var s = makeMapper();
        switchToMid(s.mapper);
        var result = s.mapper.encoderParamId(tt.encoder);
        assert(result === tt.param,
            'mid ' + tt.name + ': encoder ' + tt.encoder + ' -> ' + tt.param + ', got ' + result);
    })(midTurnTests[mti]);
}

// ---- mid handleClick tests ----

var midClickTests = [
    { encoder: 9,  paramId: PARAM_IDS.Q8_ACTIVE,  activeId: PARAM_IDS.Q8_ACTIVE,  name: 'Mid Low' },
    { encoder: 10, paramId: PARAM_IDS.Q9_ACTIVE,  activeId: PARAM_IDS.Q9_ACTIVE,  name: 'Mid LowMids' },
    { encoder: 11, paramId: PARAM_IDS.Q10_ACTIVE, activeId: PARAM_IDS.Q10_ACTIVE, name: 'Mid HighMids' },
    { encoder: 12, paramId: PARAM_IDS.Q11_ACTIVE, activeId: PARAM_IDS.Q11_ACTIVE, name: 'Mid High' },
    { encoder: 13, paramId: PARAM_IDS.Q7_ACTIVE,  activeId: PARAM_IDS.Q7_ACTIVE,  name: 'Mid Lowest' },
    { encoder: 15, paramId: PARAM_IDS.Q12_ACTIVE, activeId: PARAM_IDS.Q12_ACTIVE, name: 'Mid Highest' },
];

for (var mci = 0; mci < midClickTests.length; mci++) {
    // mid handleClick returns toggle to active when band is inactive
    (function(ct) {
        var s = makeMapper();
        switchToMid(s.mapper);
        var result = s.mapper.handleClick(ct.encoder);
        assert(result !== null, ct.name + ': encoder ' + ct.encoder + ' returns a toggle');
        assert(result.paramId === ct.paramId, ct.name + ': paramId is ' + ct.paramId);
        assert(result.value === 1, ct.name + ': default toggles to active (1)');
        assert(result.resolution === 2, ct.name + ': resolution is 2');
    })(midClickTests[mci]);

    // mid handleClick returns toggle to inactive after band is activated
    (function(ct) {
        var s = makeMapper();
        switchToMid(s.mapper);
        s.mapper.feed(ct.activeId, 1.0);
        var result = s.mapper.handleClick(ct.encoder);
        assert(result !== null, ct.name + ': encoder ' + ct.encoder + ' returns a toggle after active');
        assert(result.paramId === ct.paramId, ct.name + ': paramId is ' + ct.paramId);
        assert(result.value === 0, ct.name + ': active toggles to inactive (0)');
        assert(result.resolution === 2, ct.name + ': resolution is 2');
    })(midClickTests[mci]);
}

// ---- mid hold-turn filter tests ----

var midHoldTurnTests = [
    { band: 'Mid Low',      holdButton: 1, encoder: 5, filterParam: PARAM_IDS.Q8_FILTER,  defaultParam: PARAM_IDS.Q8_QUALITY },
    { band: 'Mid LowMids',  holdButton: 2, encoder: 6, filterParam: PARAM_IDS.Q9_FILTER,  defaultParam: PARAM_IDS.Q9_QUALITY },
    { band: 'Mid HighMids', holdButton: 3, encoder: 7, filterParam: PARAM_IDS.Q10_FILTER, defaultParam: PARAM_IDS.Q10_QUALITY },
    { band: 'Mid High',     holdButton: 4, encoder: 8, filterParam: PARAM_IDS.Q11_FILTER, defaultParam: PARAM_IDS.Q11_QUALITY },
];

for (var mhi = 0; mhi < midHoldTurnTests.length; mhi++) {
    // mid hold-turn returns FILTER param
    (function(ht) {
        var s = makeMapper();
        switchToMid(s.mapper);
        s.mapper.notifyButtonState(ht.holdButton, true);
        var result = s.mapper.encoderParamId(ht.encoder);
        assert(result === ht.filterParam,
            ht.band + ': hold button ' + ht.holdButton + ' + encoder ' + ht.encoder + ' returns FILTER, got ' + result);
    })(midHoldTurnTests[mhi]);

    // mid default (no hold) returns QUALITY param
    (function(ht) {
        var s = makeMapper();
        switchToMid(s.mapper);
        var result = s.mapper.encoderParamId(ht.encoder);
        assert(result === ht.defaultParam,
            ht.band + ': encoder ' + ht.encoder + ' default returns QUALITY, got ' + result);
    })(midHoldTurnTests[mhi]);
}

// ---- mid handleHold solo tests ----

var midSoloTests = [
    { encoder: 5, soloStep: 8, name: 'Mid Low' },
    { encoder: 6, soloStep: 9, name: 'Mid LowMids' },
    { encoder: 7, soloStep: 10, name: 'Mid HighMids' },
    { encoder: 8, soloStep: 11, name: 'Mid High' },
];

for (var msi = 0; msi < midSoloTests.length; msi++) {
    // mid handleHold press returns mid solo step for BAND_SOLO
    (function(st) {
        var s = makeMapper();
        switchToMid(s.mapper);
        var result = s.mapper.handleHold(st.encoder, true);
        assert(result !== null, st.name + ': encoder ' + st.encoder + ' press returns a hold action');
        assert(result.paramId === PARAM_IDS.BAND_SOLO, st.name + ': paramId is BAND_SOLO');
        assert(result.value === st.soloStep, st.name + ': press value is ' + st.soloStep + ', got ' + result.value);
        assert(result.resolution === 19, st.name + ': resolution is 19');
    })(midSoloTests[msi]);

    // mid handleHold release returns 0 (unsolo)
    (function(st) {
        var s = makeMapper();
        switchToMid(s.mapper);
        var result = s.mapper.handleHold(st.encoder, false);
        assert(result !== null, st.name + ': encoder ' + st.encoder + ' release returns a hold action');
        assert(result.paramId === PARAM_IDS.BAND_SOLO, st.name + ': release paramId is BAND_SOLO');
        assert(result.value === 0, st.name + ': release value is 0');
        assert(result.resolution === 19, st.name + ': release resolution is 19');
    })(midSoloTests[msi]);
}

// ===========================================================================
// Side mode tests
// ===========================================================================

function switchToSideSolo(mapper) {
    mapper.feed(PARAM_IDS.MODE, 1.0); // step 4 = SideSolo
}

// ---- side encoder param ID tests ----

var sideTurnTests = [
    { encoder: 1,  param: PARAM_IDS.Q14_FREQ,    name: 'Q14 freq' },
    { encoder: 5,  param: PARAM_IDS.Q14_QUALITY,  name: 'Q14 Q' },
    { encoder: 9,  param: PARAM_IDS.Q14_GAIN,     name: 'Q14 gain' },
    { encoder: 2,  param: PARAM_IDS.Q15_FREQ,     name: 'Q15 freq' },
    { encoder: 6,  param: PARAM_IDS.Q15_QUALITY,  name: 'Q15 Q' },
    { encoder: 10, param: PARAM_IDS.Q15_GAIN,     name: 'Q15 gain' },
    { encoder: 3,  param: PARAM_IDS.Q16_FREQ,     name: 'Q16 freq' },
    { encoder: 7,  param: PARAM_IDS.Q16_QUALITY,  name: 'Q16 Q' },
    { encoder: 11, param: PARAM_IDS.Q16_GAIN,     name: 'Q16 gain' },
    { encoder: 4,  param: PARAM_IDS.Q17_FREQ,     name: 'Q17 freq' },
    { encoder: 8,  param: PARAM_IDS.Q17_QUALITY,  name: 'Q17 Q' },
    { encoder: 12, param: PARAM_IDS.Q17_GAIN,     name: 'Q17 gain' },
    { encoder: 13, param: PARAM_IDS.Q13_FREQ,     name: 'Q13 freq' },
    { encoder: 14, param: PARAM_IDS.Q13_QUALITY,  name: 'Q13 Q' },
    { encoder: 15, param: PARAM_IDS.Q18_FREQ,     name: 'Q18 freq' },
    { encoder: 16, param: PARAM_IDS.Q18_QUALITY,  name: 'Q18 Q' },
];

// side mode: encoderParamId routes to Q13-Q18 param IDs
for (var sti = 0; sti < sideTurnTests.length; sti++) {
    (function(tt) {
        var s = makeMapper();
        switchToSide(s.mapper);
        var result = s.mapper.encoderParamId(tt.encoder);
        assert(result === tt.param,
            'side ' + tt.name + ': encoder ' + tt.encoder + ' -> ' + tt.param + ', got ' + result);
    })(sideTurnTests[sti]);
}

// ---- side handleClick tests ----

var sideClickTests = [
    { encoder: 9,  paramId: PARAM_IDS.Q14_ACTIVE,  activeId: PARAM_IDS.Q14_ACTIVE,  name: 'Side Low' },
    { encoder: 10, paramId: PARAM_IDS.Q15_ACTIVE,  activeId: PARAM_IDS.Q15_ACTIVE,  name: 'Side LowMids' },
    { encoder: 11, paramId: PARAM_IDS.Q16_ACTIVE, activeId: PARAM_IDS.Q16_ACTIVE, name: 'Side HighMids' },
    { encoder: 12, paramId: PARAM_IDS.Q17_ACTIVE, activeId: PARAM_IDS.Q17_ACTIVE, name: 'Side High' },
    { encoder: 13, paramId: PARAM_IDS.Q13_ACTIVE,  activeId: PARAM_IDS.Q13_ACTIVE,  name: 'Side Lowest' },
    { encoder: 15, paramId: PARAM_IDS.Q18_ACTIVE, activeId: PARAM_IDS.Q18_ACTIVE, name: 'Side Highest' },
];

for (var sci = 0; sci < sideClickTests.length; sci++) {
    // side handleClick returns toggle to active when band is inactive
    (function(ct) {
        var s = makeMapper();
        switchToSide(s.mapper);
        var result = s.mapper.handleClick(ct.encoder);
        assert(result !== null, ct.name + ': encoder ' + ct.encoder + ' returns a toggle');
        assert(result.paramId === ct.paramId, ct.name + ': paramId is ' + ct.paramId);
        assert(result.value === 1, ct.name + ': default toggles to active (1)');
        assert(result.resolution === 2, ct.name + ': resolution is 2');
    })(sideClickTests[sci]);

    // side handleClick returns toggle to inactive after band is activated
    (function(ct) {
        var s = makeMapper();
        switchToSide(s.mapper);
        s.mapper.feed(ct.activeId, 1.0);
        var result = s.mapper.handleClick(ct.encoder);
        assert(result !== null, ct.name + ': encoder ' + ct.encoder + ' returns a toggle after active');
        assert(result.paramId === ct.paramId, ct.name + ': paramId is ' + ct.paramId);
        assert(result.value === 0, ct.name + ': active toggles to inactive (0)');
        assert(result.resolution === 2, ct.name + ': resolution is 2');
    })(sideClickTests[sci]);
}

// ---- side hold-turn filter tests ----

var sideHoldTurnTests = [
    { band: 'Side Low',      holdButton: 1, encoder: 5, filterParam: PARAM_IDS.Q14_FILTER,  defaultParam: PARAM_IDS.Q14_QUALITY },
    { band: 'Side LowMids',  holdButton: 2, encoder: 6, filterParam: PARAM_IDS.Q15_FILTER,  defaultParam: PARAM_IDS.Q15_QUALITY },
    { band: 'Side HighMids', holdButton: 3, encoder: 7, filterParam: PARAM_IDS.Q16_FILTER, defaultParam: PARAM_IDS.Q16_QUALITY },
    { band: 'Side High',     holdButton: 4, encoder: 8, filterParam: PARAM_IDS.Q17_FILTER, defaultParam: PARAM_IDS.Q17_QUALITY },
];

for (var shi = 0; shi < sideHoldTurnTests.length; shi++) {
    // side hold-turn returns FILTER param
    (function(ht) {
        var s = makeMapper();
        switchToSide(s.mapper);
        s.mapper.notifyButtonState(ht.holdButton, true);
        var result = s.mapper.encoderParamId(ht.encoder);
        assert(result === ht.filterParam,
            ht.band + ': hold button ' + ht.holdButton + ' + encoder ' + ht.encoder + ' returns FILTER, got ' + result);
    })(sideHoldTurnTests[shi]);

    // side default (no hold) returns QUALITY param
    (function(ht) {
        var s = makeMapper();
        switchToSide(s.mapper);
        var result = s.mapper.encoderParamId(ht.encoder);
        assert(result === ht.defaultParam,
            ht.band + ': encoder ' + ht.encoder + ' default returns QUALITY, got ' + result);
    })(sideHoldTurnTests[shi]);
}

// ---- side handleHold solo tests ----

var sideSoloTests = [
    { encoder: 5, soloStep: 14, name: 'Side Low' },
    { encoder: 6, soloStep: 15, name: 'Side LowMids' },
    { encoder: 7, soloStep: 16, name: 'Side HighMids' },
    { encoder: 8, soloStep: 17, name: 'Side High' },
];

for (var ssi = 0; ssi < sideSoloTests.length; ssi++) {
    // side handleHold press returns side solo step for BAND_SOLO
    (function(st) {
        var s = makeMapper();
        switchToSide(s.mapper);
        var result = s.mapper.handleHold(st.encoder, true);
        assert(result !== null, st.name + ': encoder ' + st.encoder + ' press returns a hold action');
        assert(result.paramId === PARAM_IDS.BAND_SOLO, st.name + ': paramId is BAND_SOLO');
        assert(result.value === st.soloStep, st.name + ': press value is ' + st.soloStep + ', got ' + result.value);
        assert(result.resolution === 19, st.name + ': resolution is 19');
    })(sideSoloTests[ssi]);

    // side handleHold release returns 0 (unsolo)
    (function(st) {
        var s = makeMapper();
        switchToSide(s.mapper);
        var result = s.mapper.handleHold(st.encoder, false);
        assert(result !== null, st.name + ': encoder ' + st.encoder + ' release returns a hold action');
        assert(result.paramId === PARAM_IDS.BAND_SOLO, st.name + ': release paramId is BAND_SOLO');
        assert(result.value === 0, st.name + ': release value is 0');
        assert(result.resolution === 19, st.name + ': release resolution is 19');
    })(sideSoloTests[ssi]);
}

// SideSolo mode also activates the side mapper
(function() {
    var s = makeMapper();
    switchToSideSolo(s.mapper);
    assert(s.mapper.encoderParamId(1) === PARAM_IDS.Q14_FREQ, 'side solo: encoder 1 = Q14_FREQ');
})();

// ===========================================================================
// Mode switch tests
// ===========================================================================

// mode switch to Mid makes encoderParamId return mid params
(function() {
    var s = makeMapper();
    assert(s.mapper.encoderParamId(1) === PARAM_IDS.Q2_FREQ, 'stereo: encoder 1 = Q2_FREQ');
    switchToMid(s.mapper);
    assert(s.mapper.encoderParamId(1) === PARAM_IDS.Q8_FREQ, 'mid: encoder 1 = Q8_FREQ');
})();

// mode switch preserves inactive band-active state
(function() {
    var s = makeMapper();
    // activate stereo Low
    s.mapper.feed(PARAM_IDS.Q2_ACTIVE, 1.0);
    // activate mid LowMids (tracked but not painted since mid is inactive)
    s.mapper.feed(PARAM_IDS.Q9_ACTIVE, 1.0);

    // switch to Mid
    switchToMid(s.mapper);
    s.output.messages.length = 0;

    // handleClick on encoder 10 (LowMids) should toggle to inactive (was activated)
    var result = s.mapper.handleClick(10);
    assert(result !== null, 'mid mode: encoder 10 returns a toggle');
    assert(result.value === 0, 'mid mode: LowMids was active, toggles to 0');

    // switch back to Stereo
    switchToStereo(s.mapper);
    s.output.messages.length = 0;

    // handleClick on encoder 9 (Low) should toggle to inactive (was activated in stereo)
    result = s.mapper.handleClick(9);
    assert(result !== null, 'stereo mode: encoder 9 returns a toggle');
    assert(result.value === 0, 'stereo mode: Low was active, toggles to 0');
})();

// mode switch clears all 16 encoders then repaints from tracked state (cold-start)
(function() {
    var s = makeMapper();
    // activate mid Low (Q8) while still in stereo (tracked silently)
    s.mapper.feed(PARAM_IDS.Q8_ACTIVE, 1.0);
    s.output.messages.length = 0;

    switchToMid(s.mapper);
    var msgs = s.output.messages;

    // at least 16 off messages (clean slate) — repaintAll adds more for inactive bands
    var offMsgs = msgs.filter(function(m) { return m.status === 0xB2 && m.data2 === 17; });
    assert(offMsgs.length >= 16, 'mode switch: at least 16 off messages, got ' + offMsgs.length);

    // 3 paint messages for mid Low (encoders 1, 5, 9) — repaint from tracked state
    var paintColorMsgs = msgs.filter(function(m) { return m.status === 0xB1; });
    assert(paintColorMsgs.length === 3,
        'mode switch: 3 color msgs for mid Low, got ' + paintColorMsgs.length);
    for (var i = 0; i < paintColorMsgs.length; i++) {
        assert(paintColorMsgs[i].data2 === TwisterPalette.red1,
            'mode switch: mid Low gets red1 color');
    }
})();

// inactive mapper does not produce MIDI ring output
(function() {
    var s = makeMapper();
    switchToMid(s.mapper);
    s.output.messages.length = 0;

    // feed stereo Q2_FREQ — stereo mapper is disabled, should not ring
    s.mapper.feed(PARAM_IDS.Q2_FREQ, 0.5);
    var ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 0, 'inactive stereo mapper produces no ring output');

    // feed mid Q8_FREQ — mid mapper is active, should ring
    s.output.messages.length = 0;
    s.mapper.feed(PARAM_IDS.Q8_FREQ, 0.5);
    ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 1, 'active mid mapper produces ring output');
})();

// inactive mapper does not produce LED paint output on band active change
(function() {
    var s = makeMapper();
    switchToMid(s.mapper);
    s.output.messages.length = 0;

    // feed stereo Q2_ACTIVE — stereo mapper is disabled, should not paint
    s.mapper.feed(PARAM_IDS.Q2_ACTIVE, 1.0);
    assert(s.output.messages.length === 0, 'inactive stereo mapper produces no LED output on band active');
})();

// switch to Side mode → all 16 encoders cleared then side mapper active
(function() {
    var s = makeMapper();
    s.mapper.feed(PARAM_IDS.Q2_ACTIVE, 1.0);
    s.output.messages.length = 0;

    switchToSide(s.mapper);
    var msgs = s.output.messages;

    // at least 16 off messages (clean slate)
    var offMsgs = msgs.filter(function(m) { return m.status === 0xB2 && m.data2 === 17; });
    assert(offMsgs.length >= 16, 'side mode: at least 16 off messages, got ' + offMsgs.length);

    // side mapper is now active — encoderParamId returns side params
    assert(s.mapper.encoderParamId(1) === PARAM_IDS.Q14_FREQ, 'side mode: encoderParamId returns Q14_FREQ');
})();

// switch Side → Stereo → correct repaint from tracked state
(function() {
    var s = makeMapper();
    s.mapper.feed(PARAM_IDS.Q2_ACTIVE, 1.0); // activate stereo Low
    switchToSide(s.mapper); // all dark, stereo state preserved
    s.output.messages.length = 0;

    switchToStereo(s.mapper);
    var msgs = s.output.messages;

    // at least 16 off messages (clean slate) — repaintAll adds more for inactive bands
    var offMsgs = msgs.filter(function(m) { return m.status === 0xB2 && m.data2 === 17; });
    assert(offMsgs.length >= 16, 'side→stereo: at least 16 off messages, got ' + offMsgs.length);

    var paintColorMsgs = msgs.filter(function(m) { return m.status === 0xB1; });
    assert(paintColorMsgs.length === 3,
        'side→stereo: 3 color msgs for Low, got ' + paintColorMsgs.length);
    for (var i = 0; i < paintColorMsgs.length; i++) {
        assert(paintColorMsgs[i].data2 === TwisterPalette.red1,
            'side→stereo: Low gets red1 color');
    }
})();

// Stereo → Mid → Stereo round-trip preserves LED state
(function() {
    var s = makeMapper();
    s.mapper.feed(PARAM_IDS.Q2_ACTIVE, 1.0); // activate stereo Low
    s.mapper.feed(PARAM_IDS.Q5_ACTIVE, 1.0); // activate stereo High
    switchToMid(s.mapper);
    s.output.messages.length = 0;

    switchToStereo(s.mapper);
    var msgs = s.output.messages;

    // at least 16 off messages (clean slate) — repaintAll adds more for inactive bands
    var offMsgs = msgs.filter(function(m) { return m.status === 0xB2 && m.data2 === 17; });
    assert(offMsgs.length >= 16, 'round-trip: at least 16 off messages, got ' + offMsgs.length);

    var paintColorMsgs = msgs.filter(function(m) { return m.status === 0xB1; });
    assert(paintColorMsgs.length === 6,
        'round-trip: 6 color msgs (Low=3 + High=3), got ' + paintColorMsgs.length);
})();

// ===========================================================================
// Ring value cache + replay tests
// ===========================================================================

// ring values cached while disabled — no ring output, then replayed on mode switch
(function() {
    var s = makeMapper();
    // feed mid Q8_FREQ while in stereo (mid is disabled)
    s.mapper.feed(PARAM_IDS.Q8_FREQ, 0.75);
    var ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 0, 'ring cache: no ring output while mid disabled');

    s.output.messages.length = 0;
    switchToMid(s.mapper);
    ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    // encoder 1 maps to Q8_FREQ in mid config
    var enc1Ring = ringMsgs.filter(function(m) { return m.data1 === 12; }); // encoder 1 -> CC 12
    assert(enc1Ring.length === 1, 'ring cache: Q8_FREQ ring replayed on mid switch, got ' + enc1Ring.length);
    assert(enc1Ring[0].data2 === 95, 'ring cache: 0.75 * 127 = 95, got ' + enc1Ring[0].data2);
})();

// ring replay sends all cached mid encoder values on mode switch
(function() {
    var s = makeMapper();
    // feed several mid params while in stereo
    s.mapper.feed(PARAM_IDS.Q8_FREQ, 0.5);
    s.mapper.feed(PARAM_IDS.Q9_GAIN, 1.0);
    s.mapper.feed(PARAM_IDS.Q10_QUALITY, 0.25);
    s.output.messages.length = 0;

    switchToMid(s.mapper);
    var ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 3, 'ring replay: 3 cached rings replayed, got ' + ringMsgs.length);
})();

// stereo ring replay after round-trip (stereo → mid → stereo)
(function() {
    var s = makeMapper();
    // feed stereo params
    s.mapper.feed(PARAM_IDS.Q2_FREQ, 0.5);
    s.mapper.feed(PARAM_IDS.Q3_GAIN, 0.8);

    switchToMid(s.mapper);
    s.output.messages.length = 0;

    switchToStereo(s.mapper);
    var ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 2, 'stereo round-trip: 2 cached rings replayed, got ' + ringMsgs.length);
})();

// side ring values cached while disabled — replayed on mode switch to side
(function() {
    var s = makeMapper();
    // feed side Q14_FREQ while in stereo (side is disabled)
    s.mapper.feed(PARAM_IDS.Q14_FREQ, 0.75);
    var ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 0, 'side ring cache: no ring output while side disabled');

    s.output.messages.length = 0;
    switchToSide(s.mapper);
    ringMsgs = s.output.messages.filter(function(m) { return m.status === 0xB0; });
    var enc1Ring = ringMsgs.filter(function(m) { return m.data1 === 12; }); // encoder 1 -> CC 12
    assert(enc1Ring.length === 1, 'side ring cache: Q14_FREQ ring replayed on side switch, got ' + enc1Ring.length);
    assert(enc1Ring[0].data2 === 95, 'side ring cache: 0.75 * 127 = 95, got ' + enc1Ring[0].data2);
})();

// ===========================================================================
// resync() tests
// ===========================================================================

// resync replays band colors and ring values for the active mapper
(function() {
    var s = makeMapper();
    // activate Low and feed ring values
    s.mapper.feed(PARAM_IDS.Q2_ACTIVE, 1.0);
    s.mapper.feed(PARAM_IDS.Q2_FREQ, 0.5);
    s.mapper.feed(PARAM_IDS.Q3_GAIN, 0.8);
    s.output.messages.length = 0;

    s.mapper.resync();
    var msgs = s.output.messages;

    // repaintAll: Low active (3 encoders × 2 msgs = 6 paint) + 5 other bands off (10+2 = 12 off msgs)
    var paintColorMsgs = msgs.filter(function(m) { return m.status === 0xB1; });
    assert(paintColorMsgs.length === 3, 'resync: 3 color msgs for active Low band, got ' + paintColorMsgs.length);

    // replayRings: 2 ring messages (Q2_FREQ and Q3_GAIN)
    var ringMsgs = msgs.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 2, 'resync: 2 ring messages replayed, got ' + ringMsgs.length);
})();

// resync does nothing when no active mapper (null _active)
(function() {
    var s = makeMapper();
    s.mapper._active = null;
    s.output.messages.length = 0;
    s.mapper.resync();
    assert(s.output.messages.length === 0, 'resync: no output when _active is null');
})();

// resync in mid mode replays mid state
(function() {
    var s = makeMapper();
    switchToMid(s.mapper);
    s.mapper.feed(PARAM_IDS.Q8_ACTIVE, 1.0);
    s.mapper.feed(PARAM_IDS.Q8_FREQ, 0.75);
    s.output.messages.length = 0;

    s.mapper.resync();
    var msgs = s.output.messages;

    var paintColorMsgs = msgs.filter(function(m) { return m.status === 0xB1; });
    assert(paintColorMsgs.length === 3, 'resync mid: 3 color msgs for active Low band, got ' + paintColorMsgs.length);

    var ringMsgs = msgs.filter(function(m) { return m.status === 0xB0; });
    assert(ringMsgs.length === 1, 'resync mid: 1 ring message replayed, got ' + ringMsgs.length);
})();

// ---- summary ----

process.exit(t.summary('FrequalizerTwisterMapper'));
