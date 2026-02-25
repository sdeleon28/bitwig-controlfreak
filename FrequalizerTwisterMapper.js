// ---------------------------------------------------------------------------
// FrequalizerTwisterMapper — Wires FrequalizerDevice callbacks to TwisterPainter
// ---------------------------------------------------------------------------

var BAND_CONFIG = [
    { band: 'Low',      paramId: 'Q2_ACTIVE', button: 9,  encoders: [1, 5, 9],   color: 'red1',     soloButton: 5, soloStep: 2 },
    { band: 'LowMids',  paramId: 'Q3_ACTIVE', button: 10, encoders: [2, 6, 10],  color: 'green2',   soloButton: 6, soloStep: 3 },
    { band: 'HighMids', paramId: 'Q4_ACTIVE', button: 11, encoders: [3, 7, 11],  color: 'orange2',  soloButton: 7, soloStep: 4 },
    { band: 'High',     paramId: 'Q5_ACTIVE', button: 12, encoders: [4, 8, 12],  color: 'yellow11', soloButton: 8, soloStep: 5 },
    { band: 'Lowest',   paramId: 'Q1_ACTIVE', button: 13, encoders: [13, 14],    color: 'blue1' },
    { band: 'Highest',  paramId: 'Q6_ACTIVE', button: 15, encoders: [15, 16],    color: 'red7' },
];

class FrequalizerTwisterMapper {
    constructor(deps) {
        deps = deps || {};
        this._device = deps.device;
        this._painter = deps.painter;
        this.println = deps.println || function() {};
        this._bandActive = {};
        this._bandByButton = {};
        this._bandByName = {};
        this._soloByButton = {};

        for (var i = 0; i < BAND_CONFIG.length; i++) {
            var cfg = BAND_CONFIG[i];
            this._bandByButton[cfg.button] = cfg;
            this._bandByName[cfg.band] = cfg;
            if (cfg.soloButton) this._soloByButton[cfg.soloButton] = cfg;
        }

        var self = this;
        this._device.onBandActiveChanged(function(band, isActive) {
            self._onBandActive(band, isActive);
        });
    }

    _onBandActive(band, isActive) {
        var cfg = this._bandByName[band];
        if (!cfg) return;
        this._bandActive[band] = isActive;
        for (var i = 0; i < cfg.encoders.length; i++) {
            if (isActive) {
                this._painter.paint(cfg.encoders[i], TwisterPalette[cfg.color]);
            } else {
                this._painter.off(cfg.encoders[i]);
            }
        }
    }

    feed(id, value) { return this._device.feed(id, value); }

    handleClick(encoder) {
        var cfg = this._bandByButton[encoder];
        if (!cfg) return null;
        return {
            paramId: FrequalizerDevice.PARAM_IDS[cfg.paramId],
            value: this._bandActive[cfg.band] ? 0 : 1,
            resolution: 2
        };
    }

    handleHold(encoder, pressed) {
        var cfg = this._soloByButton[encoder];
        if (!cfg) return null;
        return {
            paramId: FrequalizerDevice.PARAM_IDS.BAND_SOLO,
            value: pressed ? cfg.soloStep : 0,
            resolution: 19
        };
    }
}

if (typeof module !== 'undefined') module.exports = FrequalizerTwisterMapper;
