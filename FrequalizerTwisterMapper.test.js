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
        assert(result.value === 1.0, ct.name + ': default toggles to active (1.0)');
    })(clickTests[ci]);

    // handleClick returns toggle to inactive after band is activated
    (function(ct) {
        var s = makeMapper();
        s.mapper.feed(ct.activeId, 1.0);
        var result = s.mapper.handleClick(ct.encoder);
        assert(result !== null, ct.name + ': encoder ' + ct.encoder + ' returns a toggle after active');
        assert(result.paramId === ct.paramId, ct.name + ': paramId is ' + ct.paramId);
        assert(result.value === 0.0, ct.name + ': active toggles to inactive (0.0)');
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

// ---- summary ----

process.exit(t.summary('FrequalizerTwisterMapper'));
