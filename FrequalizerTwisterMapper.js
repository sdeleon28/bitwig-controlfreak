// ---------------------------------------------------------------------------
// FrequalizerTwisterMapper — Wires FrequalizerDevice callbacks to TwisterPainter
// ---------------------------------------------------------------------------

var BAND_CONFIG = [
    { band: 'Low',      paramId: 'Q2_ACTIVE', button: 9,  color: 'red1',     soloButton: 5, soloStep: 2,
      encoderParams: [
          { encoder: 1, param: 'Q2_FREQ' },
          { encoder: 5, param: 'Q2_QUALITY' },
          { encoder: 9, param: 'Q2_GAIN' },
      ]},
    { band: 'LowMids',  paramId: 'Q3_ACTIVE', button: 10, color: 'green2',   soloButton: 6, soloStep: 3,
      encoderParams: [
          { encoder: 2, param: 'Q3_FREQ' },
          { encoder: 6, param: 'Q3_QUALITY' },
          { encoder: 10, param: 'Q3_GAIN' },
      ]},
    { band: 'HighMids', paramId: 'Q4_ACTIVE', button: 11, color: 'orange2',  soloButton: 7, soloStep: 4,
      encoderParams: [
          { encoder: 3, param: 'Q4_FREQ' },
          { encoder: 7, param: 'Q4_QUALITY' },
          { encoder: 11, param: 'Q4_GAIN' },
      ]},
    { band: 'High',     paramId: 'Q5_ACTIVE', button: 12, color: 'yellow11', soloButton: 8, soloStep: 5,
      encoderParams: [
          { encoder: 4, param: 'Q5_FREQ' },
          { encoder: 8, param: 'Q5_QUALITY' },
          { encoder: 12, param: 'Q5_GAIN' },
      ]},
    { band: 'Lowest',   paramId: 'Q1_ACTIVE', button: 13, color: 'blue1',
      encoderParams: [
          { encoder: 13, param: 'Q1_FREQ' },
          { encoder: 14, param: 'Q1_QUALITY' },
      ]},
    { band: 'Highest',  paramId: 'Q6_ACTIVE', button: 15, color: 'red7',
      encoderParams: [
          { encoder: 15, param: 'Q6_FREQ' },
          { encoder: 16, param: 'Q6_QUALITY' },
      ]},
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

        this._paramByEncoder = {};

        for (var i = 0; i < BAND_CONFIG.length; i++) {
            var cfg = BAND_CONFIG[i];
            this._bandByButton[cfg.button] = cfg;
            this._bandByName[cfg.band] = cfg;
            if (cfg.soloButton) this._soloByButton[cfg.soloButton] = cfg;
            for (var j = 0; j < cfg.encoderParams.length; j++) {
                var ep = cfg.encoderParams[j];
                this._paramByEncoder[ep.encoder] = FrequalizerDevice.PARAM_IDS[ep.param];
            }
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
        for (var i = 0; i < cfg.encoderParams.length; i++) {
            var enc = cfg.encoderParams[i].encoder;
            if (isActive) {
                this._painter.paint(enc, TwisterPalette[cfg.color]);
            } else {
                this._painter.off(enc);
            }
        }
    }

    encoderParamId(encoder) {
        return this._paramByEncoder[encoder] || null;
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
