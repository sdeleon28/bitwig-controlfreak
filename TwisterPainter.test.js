var ns = require('./TwisterPainter');
var TwisterPalette = ns.TwisterPalette;
var TwisterPainter = ns.TwisterPainter;
var t = require('./test-assert');
var assert = t.assert;

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

// ---- tests ----

// palette completeness: 112 named colors from black(0) to purple12(111)
(function() {
    assert(TwisterPalette.black === 0, 'black is 0');
    assert(TwisterPalette.blue1 === 1, 'blue1 is 1');
    assert(TwisterPalette.purple12 === 111, 'purple12 is 111');
    var keys = Object.keys(TwisterPalette);
    assert(keys.length === 112, 'palette has 112 entries, got ' + keys.length);
})();

// palette values are contiguous 0-111
(function() {
    var values = Object.keys(TwisterPalette).map(function(k) { return TwisterPalette[k]; });
    values.sort(function(a, b) { return a - b; });
    for (var i = 0; i < 112; i++) {
        assert(values[i] === i, 'palette covers index ' + i);
    }
})();

// paint sends color on 0xB1 and brightness 47 on 0xB2
(function() {
    var out = fakeMidiOutput();
    var painter = new TwisterPainter({ midiOutput: out });
    painter.paint(1, TwisterPalette.red1);
    assert(out.messages.length === 2, 'paint sends 2 messages');
    var colorMsg = out.messages[0];
    assert(colorMsg.status === 0xB1, 'first message is color (0xB1)');
    assert(colorMsg.data1 === 12, 'encoder 1 maps to CC 12');
    assert(colorMsg.data2 === TwisterPalette.red1, 'color value is red1');
    var brightMsg = out.messages[1];
    assert(brightMsg.status === 0xB2, 'second message is brightness (0xB2)');
    assert(brightMsg.data1 === 12, 'brightness targets CC 12');
    assert(brightMsg.data2 === 47, 'brightness is 47 (full)');
})();

// off sends brightness 17 on 0xB2
(function() {
    var out = fakeMidiOutput();
    var painter = new TwisterPainter({ midiOutput: out });
    painter.off(5);
    assert(out.messages.length === 1, 'off sends 1 message');
    var msg = out.messages[0];
    assert(msg.status === 0xB2, 'off sends on 0xB2');
    assert(msg.data1 === 8, 'encoder 5 maps to CC 8');
    assert(msg.data2 === 17, 'brightness is 17 (off)');
})();

// encoderToCC matches TwisterHW convention
(function() {
    var painter = new TwisterPainter({ midiOutput: fakeMidiOutput() });
    assert(painter.encoderToCC(1) === 12, 'encoder 1 -> CC 12');
    assert(painter.encoderToCC(4) === 15, 'encoder 4 -> CC 15');
    assert(painter.encoderToCC(13) === 0, 'encoder 13 -> CC 0');
    assert(painter.encoderToCC(16) === 3, 'encoder 16 -> CC 3');
})();

// ccToEncoder is the inverse of encoderToCC
(function() {
    var painter = new TwisterPainter({ midiOutput: fakeMidiOutput() });
    assert(painter.ccToEncoder(0) === 13, 'CC 0 -> encoder 13');
    assert(painter.ccToEncoder(12) === 1, 'CC 12 -> encoder 1');
    assert(painter.ccToEncoder(3) === 16, 'CC 3 -> encoder 16');
    assert(painter.ccToEncoder(15) === 4, 'CC 15 -> encoder 4');
})();

// ring sends 0xB0 on correct CC with the given value
(function() {
    var out = fakeMidiOutput();
    var painter = new TwisterPainter({ midiOutput: out });
    painter.ring(1, 64);
    assert(out.messages.length === 1, 'ring sends 1 message');
    var msg = out.messages[0];
    assert(msg.status === 0xB0, 'ring sends on 0xB0');
    assert(msg.data1 === 12, 'encoder 1 maps to CC 12');
    assert(msg.data2 === 64, 'value is 64');
})();

// ring sends correct value for different encoders
(function() {
    var out = fakeMidiOutput();
    var painter = new TwisterPainter({ midiOutput: out });
    painter.ring(13, 0);
    assert(out.messages[0].status === 0xB0, 'ring sends on 0xB0');
    assert(out.messages[0].data1 === 0, 'encoder 13 maps to CC 0');
    assert(out.messages[0].data2 === 0, 'value is 0');
    painter.ring(16, 127);
    assert(out.messages[1].data1 === 3, 'encoder 16 maps to CC 3');
    assert(out.messages[1].data2 === 127, 'value is 127');
})();

// ccToEncoder roundtrips with encoderToCC for all 16 encoders
(function() {
    var painter = new TwisterPainter({ midiOutput: fakeMidiOutput() });
    for (var enc = 1; enc <= 16; enc++) {
        var cc = painter.encoderToCC(enc);
        var back = painter.ccToEncoder(cc);
        assert(back === enc, 'roundtrip encoder ' + enc + ' -> CC ' + cc + ' -> encoder ' + back);
    }
})();

// ---- summary ----

process.exit(t.summary('TwisterPainter'));
