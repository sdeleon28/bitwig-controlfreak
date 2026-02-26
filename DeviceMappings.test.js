var DeviceMappings = require('./DeviceMappings');
var t = require('./test-assert');
var assert = t.assert;

// DeviceMappings is an empty object (Frequalizer moved to mapper system)
(function() {
    assert(typeof DeviceMappings === 'object', "DeviceMappings should be an object");
    assert(Object.keys(DeviceMappings).length === 0, "DeviceMappings should be empty (Frequalizer moved to mapper)");
})();

process.exit(t.summary('DeviceMappings'));
