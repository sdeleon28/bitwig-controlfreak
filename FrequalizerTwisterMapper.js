// ---------------------------------------------------------------------------
// FrequalizerTwisterMapper — Wires FrequalizerDevice callbacks to TwisterPainter
// ---------------------------------------------------------------------------

// Layout shared between stereo and mid band configs. Describes encoder/button
// positions, colors, and solo assignments. Param suffixes are combined with a
// Q-number prefix by makeBandConfig().
var BAND_LAYOUT = [
    { band: 'Low',      button: 9,  color: 'red1',     soloButton: 5,
      encoders: [
          { encoder: 1, suffix: 'FREQ' },
          { encoder: 5, suffix: 'QUALITY' },
          { encoder: 9, suffix: 'GAIN' },
      ],
      holdTurn: { holdButton: 1, encoder: 5, suffix: 'FILTER' },
    },
    { band: 'LowMids',  button: 10, color: 'green2',   soloButton: 6,
      encoders: [
          { encoder: 2, suffix: 'FREQ' },
          { encoder: 6, suffix: 'QUALITY' },
          { encoder: 10, suffix: 'GAIN' },
      ],
      holdTurn: { holdButton: 2, encoder: 6, suffix: 'FILTER' },
    },
    { band: 'HighMids', button: 11, color: 'orange2',  soloButton: 7,
      encoders: [
          { encoder: 3, suffix: 'FREQ' },
          { encoder: 7, suffix: 'QUALITY' },
          { encoder: 11, suffix: 'GAIN' },
      ],
      holdTurn: { holdButton: 3, encoder: 7, suffix: 'FILTER' },
    },
    { band: 'High',     button: 12, color: 'yellow11', soloButton: 8,
      encoders: [
          { encoder: 4, suffix: 'FREQ' },
          { encoder: 8, suffix: 'QUALITY' },
          { encoder: 12, suffix: 'GAIN' },
      ],
      holdTurn: { holdButton: 4, encoder: 8, suffix: 'FILTER' },
    },
    { band: 'Lowest',   button: 13, color: 'blue1',
      encoders: [
          { encoder: 13, suffix: 'FREQ' },
          { encoder: 14, suffix: 'QUALITY' },
      ]},
    { band: 'Highest',  button: 15, color: 'red7',
      encoders: [
          { encoder: 15, suffix: 'FREQ' },
          { encoder: 16, suffix: 'QUALITY' },
      ]},
];

function makeBandConfig(qMap) {
    var config = [];
    for (var i = 0; i < BAND_LAYOUT.length; i++) {
        var layout = BAND_LAYOUT[i];
        var q = qMap[layout.band];
        var entry = {
            band: layout.band,
            paramId: q + '_ACTIVE',
            button: layout.button,
            color: layout.color,
            encoderParams: [],
        };
        if (layout.soloButton) {
            entry.soloButton = layout.soloButton;
            entry.soloStep = parseInt(q.substring(1));
        }
        for (var j = 0; j < layout.encoders.length; j++) {
            var enc = layout.encoders[j];
            entry.encoderParams.push({ encoder: enc.encoder, param: q + '_' + enc.suffix });
        }
        if (layout.holdTurn) {
            entry.holdTurn = {
                holdButton: layout.holdTurn.holdButton,
                encoder: layout.holdTurn.encoder,
                param: q + '_' + layout.holdTurn.suffix,
            };
        }
        config.push(entry);
    }
    return config;
}

var STEREO_CONFIG = makeBandConfig({ Lowest:'Q1', Low:'Q2', LowMids:'Q3', HighMids:'Q4', High:'Q5', Highest:'Q6' });
var MID_CONFIG    = makeBandConfig({ Lowest:'Q7', Low:'Q8', LowMids:'Q9', HighMids:'Q10', High:'Q11', Highest:'Q12' });
var SIDE_CONFIG   = makeBandConfig({ Lowest:'Q13', Low:'Q14', LowMids:'Q15', HighMids:'Q16', High:'Q17', Highest:'Q18' });

// ---------------------------------------------------------------------------
// FrequalizerTwisterBandMapper — handles a single set of 6 EQ bands
// ---------------------------------------------------------------------------

class FrequalizerTwisterBandMapper {
    constructor(deps, bandConfig) {
        this._painter = deps.painter;
        this._bandConfig = bandConfig;
        this._bandActive = {};
        this._bandByButton = {};
        this._bandByName = {};
        this._soloByButton = {};
        this._paramByEncoder = {};
        this._encoderByParam = {};
        this._heldButtons = {};
        this._holdTurnByEncoder = {};
        this._activeParamToBand = {};
        this._ringValues = {};
        this.enabled = true;

        for (var i = 0; i < bandConfig.length; i++) {
            var cfg = bandConfig[i];
            this._bandByButton[cfg.button] = cfg;
            this._bandByName[cfg.band] = cfg;
            if (cfg.soloButton) this._soloByButton[cfg.soloButton] = cfg;
            var activeParamId = FrequalizerDevice.PARAM_IDS[cfg.paramId];
            if (activeParamId) {
                this._activeParamToBand[activeParamId] = cfg;
            }
            for (var j = 0; j < cfg.encoderParams.length; j++) {
                var ep = cfg.encoderParams[j];
                this._paramByEncoder[ep.encoder] = FrequalizerDevice.PARAM_IDS[ep.param];
                this._encoderByParam[FrequalizerDevice.PARAM_IDS[ep.param]] = ep.encoder;
            }
            if (cfg.holdTurn) {
                this._holdTurnByEncoder[cfg.holdTurn.encoder] = {
                    holdButton: cfg.holdTurn.holdButton,
                    paramId: FrequalizerDevice.PARAM_IDS[cfg.holdTurn.param]
                };
            }
        }
    }

    _onBandActive(band, isActive) {
        var cfg = this._bandByName[band];
        if (!cfg) return;
        this._bandActive[band] = isActive;
        if (!this.enabled) return;
        for (var i = 0; i < cfg.encoderParams.length; i++) {
            var enc = cfg.encoderParams[i].encoder;
            if (isActive) {
                this._painter.paint(enc, TwisterPalette[cfg.color]);
            } else {
                this._painter.off(enc);
            }
        }
    }

    _onBandSoloed(band) {
        if (!this.enabled) return;
        if (band) {
            for (var i = 0; i < this._bandConfig.length; i++) {
                var cfg = this._bandConfig[i];
                for (var j = 0; j < cfg.encoderParams.length; j++) {
                    this._painter.off(cfg.encoderParams[j].encoder);
                }
            }
            var soloCfg = this._bandByName[band];
            if (soloCfg) {
                for (var k = 0; k < soloCfg.encoderParams.length; k++) {
                    this._painter.paint(soloCfg.encoderParams[k].encoder, TwisterPalette[soloCfg.color]);
                }
            }
        } else {
            this._repaintAll();
        }
    }

    _repaintAll() {
        for (var i = 0; i < this._bandConfig.length; i++) {
            var cfg = this._bandConfig[i];
            this._onBandActive(cfg.band, !!this._bandActive[cfg.band]);
        }
    }

    notifyButtonState(encoder, pressed) {
        this._heldButtons[encoder] = pressed;
    }

    encoderParamId(encoder) {
        if (!this.enabled) return null;
        var ht = this._holdTurnByEncoder[encoder];
        if (ht && this._heldButtons[ht.holdButton]) {
            return ht.paramId;
        }
        return this._paramByEncoder[encoder] || null;
    }

    feed(id, value) {
        var encoder = this._encoderByParam[id];
        if (encoder !== undefined) {
            var ringValue = Math.round(value * 127);
            this._ringValues[encoder] = ringValue;
            if (this.enabled) {
                this._painter.ring(encoder, ringValue);
            }
            return true;
        }

        var activeCfg = this._activeParamToBand[id];
        if (activeCfg) {
            this._onBandActive(activeCfg.band, value >= 0.5);
            return true;
        }

        return false;
    }

    _replayRings() {
        var encoders = Object.keys(this._ringValues);
        for (var i = 0; i < encoders.length; i++) {
            var enc = parseInt(encoders[i]);
            this._painter.ring(enc, this._ringValues[enc]);
        }
    }

    handleClick(encoder) {
        if (!this.enabled) return null;
        var cfg = this._bandByButton[encoder];
        if (!cfg) return null;
        return {
            paramId: FrequalizerDevice.PARAM_IDS[cfg.paramId],
            value: this._bandActive[cfg.band] ? 0 : 1,
            resolution: 2
        };
    }

    handleHold(encoder, pressed) {
        if (!this.enabled) return null;
        var cfg = this._soloByButton[encoder];
        if (!cfg) return null;
        return {
            paramId: FrequalizerDevice.PARAM_IDS.BAND_SOLO,
            value: pressed ? cfg.soloStep : 0,
            resolution: 19
        };
    }

}

// ---------------------------------------------------------------------------
// FrequalizerTwisterMapper — Container managing stereo + mid band mappers
// ---------------------------------------------------------------------------

class FrequalizerTwisterMapper {
    constructor(deps) {
        deps = deps || {};
        this._device = deps.device;
        this._painter = deps.painter;
        this.println = deps.println || function() {};

        this._mode = null;
        this._stereo = new FrequalizerTwisterBandMapper(deps, STEREO_CONFIG);
        this._mid = new FrequalizerTwisterBandMapper(deps, MID_CONFIG);
        this._mid.enabled = false;
        this._side = new FrequalizerTwisterBandMapper(deps, SIDE_CONFIG);
        this._side.enabled = false;
        this._active = this._stereo;

        var self = this;
        this._device.onBandSoloed(function(band) {
            self._stereo._onBandSoloed(band);
            self._mid._onBandSoloed(band);
            self._side._onBandSoloed(band);
        });
        this._device.onModeChanged(function(mode) {
            self._onModeChanged(mode);
        });
    }

    resync() {
        if (this._active) {
            this._active._repaintAll();
            this._active._replayRings();
        }
    }

    _onModeChanged(mode) {
        this._mode = mode;
        if (this._active) this._active.enabled = false;

        for (var i = 1; i <= 16; i++) this._painter.off(i);

        var Mode = FrequalizerDevice.Mode;
        if (mode === Mode.STEREO) {
            this._active = this._stereo;
        } else if (mode === Mode.MID || mode === Mode.MID_SOLO) {
            this._active = this._mid;
        } else if (mode === Mode.SIDE || mode === Mode.SIDE_SOLO) {
            this._active = this._side;
        } else {
            this._active = null;
        }

        if (this._active) {
            this._active.enabled = true;
            this._active._repaintAll();
            this._active._replayRings();
        }
    }

    notifyButtonState(encoder, pressed) {
        this._stereo.notifyButtonState(encoder, pressed);
        this._mid.notifyButtonState(encoder, pressed);
        this._side.notifyButtonState(encoder, pressed);
    }

    encoderParamId(encoder) {
        if (!this._active) return null;
        return this._active.encoderParamId(encoder);
    }

    handleClick(encoder) {
        if (!this._active) return null;
        return this._active.handleClick(encoder);
    }

    handleHold(encoder, pressed) {
        if (!this._active) return null;
        return this._active.handleHold(encoder, pressed);
    }

    feed(id, value) {
        var stereoHandled = this._stereo.feed(id, value);
        var midHandled = this._mid.feed(id, value);
        var sideHandled = this._side.feed(id, value);
        if (stereoHandled || midHandled || sideHandled) return true;
        return this._device.feed(id, value);
    }

}

if (typeof module !== 'undefined') module.exports = FrequalizerTwisterMapper;
