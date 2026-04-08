var TwisterHW = require('./Twister');
var t = require('../test-assert');
var assert = t.assert;

function fakeOutput() {
    var msgs = [];
    return {
        sendMidi: function(s, d1, d2) { msgs.push([s, d1, d2]); },
        _msgs: msgs
    };
}

function fakeTrack(volume, pan, color) {
    return {
        volume: function() { return { get: function(){ return volume; }, set: function(v){ volume = v; } }; },
        pan: function()    { return { get: function(){ return pan; },    set: function(v){ pan = v; } }; },
        color: function()  { return {
            red:   function(){ return color[0]; },
            green: function(){ return color[1]; },
            blue:  function(){ return color[2]; }
        }; },
        name: function() { return { get: function(){ return 'fake'; } }; },
        makeVisibleInArranger: function(){},
        _vol: function(){ return volume; },
        _pan: function(){ return pan; }
    };
}

function fakeBitwig(tracks) {
    return {
        getTrack: function(id) { return tracks[id] || null; }
    };
}

// encoderToCC and ccToEncoder are inverses
(function() {
    var tw = new TwisterHW({});
    for (var i = 1; i <= 16; i++) {
        assert(tw.ccToEncoder(tw.encoderToCC(i)) === i, 'roundtrip ' + i);
    }
})();

// linkEncoderToTrack stores link
(function() {
    var out = fakeOutput();
    var tk = fakeTrack(0.5, 0, [1,0,0]);
    var bw = fakeBitwig({ 7: tk });
    var tw = new TwisterHW({ midiOutput: out, bitwig: bw });
    tw.linkEncoderToTrack(3, 7);
    assert(tw.getEncoderForTrack(7) === 3, 'reverse map');
    assert(tw.getLinkedTrack(3) === tk, 'forward map');
})();

// turning encoder writes to volume in volume mode
(function() {
    var out = fakeOutput();
    var tk = fakeTrack(0.5, 0, [1,0,0]);
    var bw = fakeBitwig({ 0: tk });
    var tw = new TwisterHW({ midiOutput: out, bitwig: bw });
    tw.linkEncoderToTrack(1, 0);
    tw.handleEncoderTurn(1, 64);
    assert(Math.abs(tk._vol() - 64/127) < 0.001, 'volume set');
})();

// in pan mode, turn writes to pan
(function() {
    var out = fakeOutput();
    var tk = fakeTrack(0.5, 0, [1,0,0]);
    var bw = fakeBitwig({ 0: tk });
    var tw = new TwisterHW({ midiOutput: out, bitwig: bw });
    tw.linkEncoderToTrack(1, 0);
    tw.setMode('pan');
    tw.handleEncoderTurn(1, 64);
    assert(Math.abs(tk._pan() - 64/127) < 0.001, 'pan set');
})();

// unlink clears linkage
(function() {
    var out = fakeOutput();
    var tk = fakeTrack(0.5, 0, [1,0,0]);
    var bw = fakeBitwig({ 5: tk });
    var tw = new TwisterHW({ midiOutput: out, bitwig: bw });
    tw.linkEncoderToTrack(2, 5);
    tw.unlinkAll();
    assert(tw.getEncoderForTrack(5) === null, 'reverse cleared');
    assert(tw.getLinkedTrack(2) === null, 'forward cleared');
})();

// linkEncoderToMaster
(function() {
    var out = fakeOutput();
    var tk = fakeTrack(0.5, 0, [0,0,1]);
    var tw = new TwisterHW({ midiOutput: out });
    tw.linkEncoderToMaster(16, tk);
    assert(tw.getLinkedTrack(16) === tk, 'master linked to encoder 16');
})();

process.exit(t.summary('Twister (live)'));
