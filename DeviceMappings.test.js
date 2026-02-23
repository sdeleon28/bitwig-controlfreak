var DeviceMappings = require('./DeviceMappings');
var t = require('./test-assert');
var assert = t.assert;

var freqMapping = DeviceMappings["Frequalizer Alt"];

// has 6 bands
(function() {
    assert(freqMapping.length === 6, "Frequalizer Alt should have 6 bands");
})();

// each band has color, encoders, and buttons arrays
(function() {
    for (var i = 0; i < freqMapping.length; i++) {
        var band = freqMapping[i];
        assert(band.color && typeof band.color.r === 'number', "band " + i + " should have color.r");
        assert(typeof band.color.g === 'number', "band " + i + " should have color.g");
        assert(typeof band.color.b === 'number', "band " + i + " should have color.b");
        assert(Array.isArray(band.encoders), "band " + i + " should have encoders array");
        assert(Array.isArray(band.buttons), "band " + i + " should have buttons array");
    }
})();

// all encoder numbers are in 1-16 range
(function() {
    for (var i = 0; i < freqMapping.length; i++) {
        var band = freqMapping[i];
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
    for (var i = 0; i < freqMapping.length; i++) {
        var band = freqMapping[i];
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
    for (var i = 0; i < freqMapping.length; i++) {
        var band = freqMapping[i];
        for (var b = 0; b < band.buttons.length; b++) {
            var num = band.buttons[b].encoder;
            assert(!seen[num], "button " + num + " should not be duplicated (press)");
            seen[num] = true;
        }
    }
})();

// all paramIds start with CONTENTS/PID
(function() {
    for (var i = 0; i < freqMapping.length; i++) {
        var band = freqMapping[i];
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

// total of 14 encoder mappings and 6 button mappings
(function() {
    var totalEncoders = 0;
    var totalButtons = 0;
    for (var i = 0; i < freqMapping.length; i++) {
        totalEncoders += freqMapping[i].encoders.length;
        totalButtons += freqMapping[i].buttons.length;
    }
    assert(totalEncoders === 16, "should have 16 encoder (turn) mappings, got " + totalEncoders);
    assert(totalButtons === 6, "should have 6 button (press) mappings, got " + totalButtons);
})();

process.exit(t.summary('DeviceMappings'));
