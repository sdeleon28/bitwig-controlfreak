var t = require('./test-assert');
var assert = t.assert;
var FrequalizerDevice = require('./FrequalizerDevice');

var Band = FrequalizerDevice.Band;
var Mode = FrequalizerDevice.Mode;
var PARAM_IDS = FrequalizerDevice.PARAM_IDS;
var normalizedToStep = FrequalizerDevice.normalizedToStep;

function makeDevice(opts) {
    opts = opts || {};
    return new FrequalizerDevice({
        debug: false,
        println: function() {}
    });
}

// ===========================================================================
// normalizedToStep
// ===========================================================================

// normalizedToStep converts 0.0 to step 0
(function() {
    assert(normalizedToStep(0.0, 19) === 0, 'step 0 for value 0.0');
})();

// normalizedToStep converts 1.0 to max step
(function() {
    assert(normalizedToStep(1.0, 19) === 18, 'step 18 for value 1.0 with resolution 19');
    assert(normalizedToStep(1.0, 5) === 4, 'step 4 for value 1.0 with resolution 5');
})();

// normalizedToStep rounds to nearest step
(function() {
    // 1/18 ≈ 0.0556 → step 1
    assert(normalizedToStep(1 / 18, 19) === 1, 'step 1 for value 1/18');
    // 6/18 ≈ 0.3333 → step 6
    assert(normalizedToStep(6 / 18, 19) === 6, 'step 6 for value 6/18');
})();

// ===========================================================================
// feed — routing
// ===========================================================================

// feed returns false for unknown param IDs
(function() {
    var dev = makeDevice();
    assert(dev.feed('CONTENTS/UNKNOWN', 0.5) === false, 'unknown param returns false');
})();

// feed returns true for known param IDs even without callbacks
(function() {
    var dev = makeDevice();
    assert(dev.feed(PARAM_IDS.BAND_SOLO, 0.0) === true, 'band solo returns true without callback');
    assert(dev.feed(PARAM_IDS.MODE, 0.0) === true, 'mode returns true without callback');
    assert(dev.feed(PARAM_IDS.Q1_ACTIVE, 1.0) === true, 'active returns true without callback');
})();

// ===========================================================================
// onBandSoloed
// ===========================================================================

// onBandSoloed fires with null when step is 0 (no band soloed)
(function() {
    var dev = makeDevice();
    var received = 'NOT_CALLED';
    dev.onBandSoloed(function(band) { received = band; });
    dev.feed(PARAM_IDS.BAND_SOLO, 0.0);
    assert(received === null, 'band solo step 0 = null (no solo)');
})();

// onBandSoloed fires with correct band for each solo value
(function() {
    var dev = makeDevice();
    var received = null;
    dev.onBandSoloed(function(band) { received = band; });

    dev.feed(PARAM_IDS.BAND_SOLO, 1 / 18);
    assert(received === Band.LOWEST, 'band solo step 1 = Lowest');

    dev.feed(PARAM_IDS.BAND_SOLO, 2 / 18);
    assert(received === Band.LOW, 'band solo step 2 = Low');

    dev.feed(PARAM_IDS.BAND_SOLO, 3 / 18);
    assert(received === Band.LOW_MIDS, 'band solo step 3 = LowMids');

    dev.feed(PARAM_IDS.BAND_SOLO, 4 / 18);
    assert(received === Band.HIGH_MIDS, 'band solo step 4 = HighMids');

    dev.feed(PARAM_IDS.BAND_SOLO, 5 / 18);
    assert(received === Band.HIGH, 'band solo step 5 = High');

    dev.feed(PARAM_IDS.BAND_SOLO, 6 / 18);
    assert(received === Band.HIGHEST, 'band solo step 6 = Highest');
})();

// onBandSoloed fires with correct band for mid solo steps (7-12)
(function() {
    var dev = makeDevice();
    var received = null;
    dev.onBandSoloed(function(band) { received = band; });

    dev.feed(PARAM_IDS.BAND_SOLO, 7 / 18);
    assert(received === Band.LOWEST, 'band solo step 7 = Lowest (mid)');

    dev.feed(PARAM_IDS.BAND_SOLO, 8 / 18);
    assert(received === Band.LOW, 'band solo step 8 = Low (mid)');

    dev.feed(PARAM_IDS.BAND_SOLO, 9 / 18);
    assert(received === Band.LOW_MIDS, 'band solo step 9 = LowMids (mid)');

    dev.feed(PARAM_IDS.BAND_SOLO, 10 / 18);
    assert(received === Band.HIGH_MIDS, 'band solo step 10 = HighMids (mid)');

    dev.feed(PARAM_IDS.BAND_SOLO, 11 / 18);
    assert(received === Band.HIGH, 'band solo step 11 = High (mid)');

    dev.feed(PARAM_IDS.BAND_SOLO, 12 / 18);
    assert(received === Band.HIGHEST, 'band solo step 12 = Highest (mid)');
})();

// band solo out-of-range step returns null
(function() {
    var dev = makeDevice();
    var received = 'NOT_CALLED';
    dev.onBandSoloed(function(band) { received = band; });
    dev.feed(PARAM_IDS.BAND_SOLO, 13 / 18);
    assert(received === null, 'band solo step 13 (out of range) = null');
})();

// ===========================================================================
// onModeChanged
// ===========================================================================

// onModeChanged fires with correct mode for each value
(function() {
    var dev = makeDevice();
    var received = null;
    dev.onModeChanged(function(mode) { received = mode; });

    dev.feed(PARAM_IDS.MODE, 0.0);
    assert(received === Mode.STEREO, 'mode 0.0 = Stereo');

    dev.feed(PARAM_IDS.MODE, 0.25);
    assert(received === Mode.MID, 'mode 0.25 = Mid');

    dev.feed(PARAM_IDS.MODE, 0.5);
    assert(received === Mode.SIDE, 'mode 0.5 = Side');

    dev.feed(PARAM_IDS.MODE, 0.75);
    assert(received === Mode.MID_SOLO, 'mode 0.75 = MidSolo');

    dev.feed(PARAM_IDS.MODE, 1.0);
    assert(received === Mode.SIDE_SOLO, 'mode 1.0 = SideSolo');
})();

// ===========================================================================
// onBandActiveChanged
// ===========================================================================

// onBandActiveChanged fires with correct band and boolean for each active param
(function() {
    var dev = makeDevice();
    var receivedBand = null;
    var receivedActive = null;
    dev.onBandActiveChanged(function(band, isActive) {
        receivedBand = band;
        receivedActive = isActive;
    });

    dev.feed(PARAM_IDS.Q1_ACTIVE, 1.0);
    assert(receivedBand === Band.LOWEST, 'Q1 active band = Lowest');
    assert(receivedActive === true, 'Q1 active = true');

    dev.feed(PARAM_IDS.Q2_ACTIVE, 0.0);
    assert(receivedBand === Band.LOW, 'Q2 active band = Low');
    assert(receivedActive === false, 'Q2 active = false');

    dev.feed(PARAM_IDS.Q3_ACTIVE, 1.0);
    assert(receivedBand === Band.LOW_MIDS, 'Q3 active band = LowMids');
    assert(receivedActive === true, 'Q3 active = true');

    dev.feed(PARAM_IDS.Q4_ACTIVE, 0.0);
    assert(receivedBand === Band.HIGH_MIDS, 'Q4 active band = HighMids');
    assert(receivedActive === false, 'Q4 active = false');

    dev.feed(PARAM_IDS.Q5_ACTIVE, 1.0);
    assert(receivedBand === Band.HIGH, 'Q5 active band = High');
    assert(receivedActive === true, 'Q5 active = true');

    dev.feed(PARAM_IDS.Q6_ACTIVE, 0.0);
    assert(receivedBand === Band.HIGHEST, 'Q6 active band = Highest');
    assert(receivedActive === false, 'Q6 active = false');
})();

// Q7-Q12 active params are not in ACTIVE_PARAM_TO_BAND (handled by mapper)
(function() {
    var dev = makeDevice();
    var called = false;
    dev.onBandActiveChanged(function() { called = true; });

    var midActiveParams = [
        PARAM_IDS.Q7_ACTIVE, PARAM_IDS.Q8_ACTIVE, PARAM_IDS.Q9_ACTIVE,
        PARAM_IDS.Q10_ACTIVE, PARAM_IDS.Q11_ACTIVE, PARAM_IDS.Q12_ACTIVE
    ];
    for (var i = 0; i < midActiveParams.length; i++) {
        var result = dev.feed(midActiveParams[i], 1.0);
        assert(result === false, 'Q' + (i + 7) + '_ACTIVE returns false from device.feed');
        assert(called === false, 'Q' + (i + 7) + '_ACTIVE does not fire onBandActiveChanged');
    }
})();

process.exit(t.summary('FrequalizerDevice'));
