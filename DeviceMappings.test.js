var DeviceMappings = require('./DeviceMappings');
var t = require('./test-assert');
var assert = t.assert;

var freqMapping = DeviceMappings["Frequalizer Alt"];
var bands = freqMapping.bands;

// has 6 bands
(function() {
    assert(bands.length === 6, "Frequalizer Alt should have 6 bands");
})();

// each band has color, encoders, and buttons arrays
(function() {
    for (var i = 0; i < bands.length; i++) {
        var band = bands[i];
        assert(band.color && typeof band.color.r === 'number', "band " + i + " should have color.r");
        assert(typeof band.color.g === 'number', "band " + i + " should have color.g");
        assert(typeof band.color.b === 'number', "band " + i + " should have color.b");
        assert(Array.isArray(band.encoders), "band " + i + " should have encoders array");
        assert(Array.isArray(band.buttons), "band " + i + " should have buttons array");
    }
})();

// all encoder numbers are in 1-16 range
(function() {
    for (var i = 0; i < bands.length; i++) {
        var band = bands[i];
        for (var e = 0; e < band.encoders.length; e++) {
            var num = band.encoders[e].encoder;
            assert(num >= 1 && num <= 16, "encoder " + num + " in band " + i + " should be 1-16");
        }
        for (var b = 0; b < band.buttons.length; b++) {
            var num = band.buttons[b].encoder;
            assert(num >= 1 && num <= 16, "button " + num + " in band " + i + " should be 1-16");
        }
    }
})();

// no duplicate encoder assignments (turn)
(function() {
    var seen = {};
    for (var i = 0; i < bands.length; i++) {
        var band = bands[i];
        for (var e = 0; e < band.encoders.length; e++) {
            var num = band.encoders[e].encoder;
            assert(!seen[num], "encoder " + num + " should not be duplicated (turn)");
            seen[num] = true;
        }
    }
})();

// no duplicate button assignments (press)
(function() {
    var seen = {};
    for (var i = 0; i < bands.length; i++) {
        var band = bands[i];
        for (var b = 0; b < band.buttons.length; b++) {
            var num = band.buttons[b].encoder;
            assert(!seen[num], "button " + num + " should not be duplicated (press)");
            seen[num] = true;
        }
    }
})();

// all paramIds start with CONTENTS/PID
(function() {
    for (var i = 0; i < bands.length; i++) {
        var band = bands[i];
        for (var e = 0; e < band.encoders.length; e++) {
            var id = band.encoders[e].paramId;
            assert(id.indexOf('CONTENTS/PID') === 0, "encoder paramId '" + id + "' should start with CONTENTS/PID");
        }
        for (var b = 0; b < band.buttons.length; b++) {
            var id = band.buttons[b].paramId;
            assert(id.indexOf('CONTENTS/PID') === 0, "button paramId '" + id + "' should start with CONTENTS/PID");
        }
    }
})();

// total of 16 encoder mappings and 12 button mappings
(function() {
    var totalEncoders = 0;
    var totalButtons = 0;
    for (var i = 0; i < bands.length; i++) {
        totalEncoders += bands[i].encoders.length;
        totalButtons += bands[i].buttons.length;
    }
    assert(totalEncoders === 16, "should have 16 encoder (turn) mappings, got " + totalEncoders);
    assert(totalButtons === 12, "should have 12 button (press) mappings, got " + totalButtons);
})();

// pads config exists and has 5 entries
(function() {
    var pads = freqMapping.pads;
    assert(Array.isArray(pads), "should have pads array");
    assert(pads.length === 5, "should have 5 pad entries, got " + pads.length);
})();

// each pad entry has required fields
(function() {
    var pads = freqMapping.pads;
    for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        assert(typeof p.pad === 'number', "pad " + i + " should have numeric pad");
        assert(typeof p.paramName === 'string', "pad " + i + " should have string paramName");
        assert(typeof p.value === 'number', "pad " + i + " should have numeric value");
        assert(typeof p.resolution === 'number', "pad " + i + " should have numeric resolution");
        assert(typeof p.color === 'string', "pad " + i + " should have string color");
    }
})();

// pad numbers are in 1-13 range (device-specific pads)
(function() {
    var pads = freqMapping.pads;
    for (var i = 0; i < pads.length; i++) {
        assert(pads[i].pad >= 1 && pads[i].pad <= 13,
            "pad " + pads[i].pad + " should be in 1-13 range");
    }
})();

// no duplicate pad numbers
(function() {
    var pads = freqMapping.pads;
    var seen = {};
    for (var i = 0; i < pads.length; i++) {
        assert(!seen[pads[i].pad], "pad " + pads[i].pad + " should not be duplicated");
        seen[pads[i].pad] = true;
    }
})();

process.exit(t.summary('DeviceMappings'));
