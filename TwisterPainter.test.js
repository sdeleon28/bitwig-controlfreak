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

// ---- summary ----

process.exit(t.summary('TwisterPainter'));
