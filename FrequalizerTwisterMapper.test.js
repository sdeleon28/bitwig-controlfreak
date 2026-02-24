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

// ---- tests ----

// feeding Q1_ACTIVE with 1.0 paints encoders 13 and 14 red
(function() {
    var s = makeMapper();
    s.mapper.feed(PARAM_IDS.Q1_ACTIVE, 1.0);
    // paint(13, red1) sends 2 messages, paint(14, red1) sends 2 messages = 4 total
    assert(s.output.messages.length === 4, 'active band sends 4 messages, got ' + s.output.messages.length);
    // First pair: encoder 13
    assert(s.output.messages[0].status === 0xB1, 'msg 0 is color channel');
    assert(s.output.messages[0].data2 === TwisterPalette.red1, 'encoder 13 gets red1');
    assert(s.output.messages[1].status === 0xB2, 'msg 1 is brightness channel');
    // Second pair: encoder 14
    assert(s.output.messages[2].status === 0xB1, 'msg 2 is color channel');
    assert(s.output.messages[2].data2 === TwisterPalette.red1, 'encoder 14 gets red1');
    assert(s.output.messages[3].status === 0xB2, 'msg 3 is brightness channel');
})();

// feeding Q1_ACTIVE with 0.0 turns off encoders 13 and 14
(function() {
    var s = makeMapper();
    s.mapper.feed(PARAM_IDS.Q1_ACTIVE, 0.0);
    // off(13) sends 1 message, off(14) sends 1 message = 2 total
    assert(s.output.messages.length === 2, 'inactive band sends 2 messages, got ' + s.output.messages.length);
    assert(s.output.messages[0].status === 0xB2, 'msg 0 is brightness (off)');
    assert(s.output.messages[0].data2 === 17, 'encoder 13 brightness is 17 (off)');
    assert(s.output.messages[1].status === 0xB2, 'msg 1 is brightness (off)');
    assert(s.output.messages[1].data2 === 17, 'encoder 14 brightness is 17 (off)');
})();

// feeding a non-Lowest band active param produces no painter calls
(function() {
    var s = makeMapper();
    s.mapper.feed(PARAM_IDS.Q2_ACTIVE, 1.0);
    assert(s.output.messages.length === 0, 'non-Lowest band produces no output');
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
