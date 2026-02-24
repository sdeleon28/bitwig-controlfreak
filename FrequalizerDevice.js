// ---------------------------------------------------------------------------
// FrequalizerDevice — Enum abstraction for Frequalizer device parameters
// ---------------------------------------------------------------------------

var FrequalizerBand = {
    LOWEST: 'Lowest', LOW: 'Low', LOW_MIDS: 'LowMids',
    HIGH_MIDS: 'HighMids', HIGH: 'High', HIGHEST: 'Highest'
};

var FrequalizerMode = {
    STEREO: 'Stereo', MID: 'Mid', SIDE: 'Side',
    MID_SOLO: 'MidSolo', SIDE_SOLO: 'SideSolo'
};

// Step-to-enum lookup arrays for decoding normalized values
var BAND_SOLO_STEPS = [
    null,
    FrequalizerBand.LOWEST, FrequalizerBand.LOW, FrequalizerBand.LOW_MIDS,
    FrequalizerBand.HIGH_MIDS, FrequalizerBand.HIGH, FrequalizerBand.HIGHEST
]; // resolution 19, steps 0–6 used

var MODE_STEPS = [
    FrequalizerMode.STEREO, FrequalizerMode.MID, FrequalizerMode.SIDE,
    FrequalizerMode.MID_SOLO, FrequalizerMode.SIDE_SOLO
]; // resolution 5

// Canonical param IDs (without ROOT_GENERIC_MODULE/ prefix)
var FREQ_PARAM_IDS = {
    // Global
    BAND_SOLO: 'CONTENTS/PID10cd4cb4',
    MODE:      'CONTENTS/PID3339a3',

    // Band 1 (Lowest)
    Q1_ACTIVE:    'CONTENTS/PID60a37761',
    Q1_FREQ:      'CONTENTS/PID5e65eb21',
    Q1_QUALITY:   'CONTENTS/PID1fdbd404',
    Q1_FILTER:    'CONTENTS/PID1372e255',

    // Band 2 (Low)
    Q2_ACTIVE:    'CONTENTS/PID10cd7bbf',
    Q2_FREQ:      'CONTENTS/PID47f82203',
    Q2_QUALITY:   'CONTENTS/PID74f25b66',
    Q2_GAIN:      'CONTENTS/PID14682278',
    Q2_FILTER:    'CONTENTS/PID146e6633',

    // Band 3 (Low Mids)
    Q3_ACTIVE:    'CONTENTS/PID78de40dc',
    Q3_FREQ:      'CONTENTS/PID7f826bc6',
    Q3_QUALITY:   'CONTENTS/PIDefa39e9',
    Q3_GAIN:      'CONTENTS/PID9318ad5',
    Q3_FILTER:    'CONTENTS/PID937ce90',

    // Band 4 (High Mids)
    Q4_ACTIVE:    'CONTENTS/PIDf24026a',
    Q4_FREQ:      'CONTENTS/PID5f199778',
    Q4_QUALITY:   'CONTENTS/PID416caa1b',
    Q4_GAIN:      'CONTENTS/PID1d7657e3',
    Q4_FILTER:    'CONTENTS/PID1d7c9b9e',

    // Band 5 (High)
    Q5_ACTIVE:    'CONTENTS/PID651c7971',
    Q5_FREQ:      'CONTENTS/PID5c3cef11',
    Q5_QUALITY:   'CONTENTS/PID2a8313f4',
    Q5_GAIN:      'CONTENTS/PID4b5ee4aa',
    Q5_FILTER:    'CONTENTS/PID4b652865',

    // Band 6 (Highest)
    Q6_ACTIVE:    'CONTENTS/PID74e8446f',
    Q6_FREQ:      'CONTENTS/PID10d85b53',
    Q6_QUALITY:   'CONTENTS/PID1430a8b6',
    Q6_FILTER:    'CONTENTS/PID49039ae3',
};

// Reverse lookup: active param ID → FrequalizerBand
var ACTIVE_PARAM_TO_BAND = {};
ACTIVE_PARAM_TO_BAND[FREQ_PARAM_IDS.Q1_ACTIVE] = FrequalizerBand.LOWEST;
ACTIVE_PARAM_TO_BAND[FREQ_PARAM_IDS.Q2_ACTIVE] = FrequalizerBand.LOW;
ACTIVE_PARAM_TO_BAND[FREQ_PARAM_IDS.Q3_ACTIVE] = FrequalizerBand.LOW_MIDS;
ACTIVE_PARAM_TO_BAND[FREQ_PARAM_IDS.Q4_ACTIVE] = FrequalizerBand.HIGH_MIDS;
ACTIVE_PARAM_TO_BAND[FREQ_PARAM_IDS.Q5_ACTIVE] = FrequalizerBand.HIGH;
ACTIVE_PARAM_TO_BAND[FREQ_PARAM_IDS.Q6_ACTIVE] = FrequalizerBand.HIGHEST;

function normalizedToStep(value, resolution) {
    return Math.round(value * (resolution - 1));
}

class FrequalizerDevice {
    constructor(deps) {
        deps = deps || {};
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};
        this._bandSoloCallback = null;
        this._modeCallback = null;
        this._bandActiveCallback = null;
    }

    onBandSoloed(cb) {
        this._bandSoloCallback = cb;
    }

    onModeChanged(cb) {
        this._modeCallback = cb;
    }

    onBandActiveChanged(cb) {
        this._bandActiveCallback = cb;
    }

    feed(id, value) {
        if (id === FREQ_PARAM_IDS.BAND_SOLO) {
            if (this._bandSoloCallback) {
                var step = normalizedToStep(value, 19);
                var band = step < BAND_SOLO_STEPS.length ? BAND_SOLO_STEPS[step] : null;
                this._bandSoloCallback(band);
            }
            return true;
        }

        if (id === FREQ_PARAM_IDS.MODE) {
            if (this._modeCallback) {
                var step = normalizedToStep(value, MODE_STEPS.length);
                var mode = MODE_STEPS[step];
                this._modeCallback(mode);
            }
            return true;
        }

        var activeBand = ACTIVE_PARAM_TO_BAND[id];
        if (activeBand !== undefined) {
            if (this._bandActiveCallback) {
                this._bandActiveCallback(activeBand, value >= 0.5);
            }
            return true;
        }

        return false;
    }
}

// Expose constants on the constructor for external use
FrequalizerDevice.Band = FrequalizerBand;
FrequalizerDevice.Mode = FrequalizerMode;
FrequalizerDevice.PARAM_IDS = FREQ_PARAM_IDS;
FrequalizerDevice.normalizedToStep = normalizedToStep;

if (typeof module !== 'undefined') module.exports = FrequalizerDevice;
