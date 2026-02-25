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

// ---- summary ----

process.exit(t.summary('FrequalizerTwisterMapper'));
