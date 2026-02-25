// ---------------------------------------------------------------------------
// FrequalizerTwisterMapper — Wires FrequalizerDevice callbacks to TwisterPainter
// ---------------------------------------------------------------------------

class FrequalizerTwisterMapper {
    constructor(deps) {
        deps = deps || {};
        this._device = deps.device;
        this._painter = deps.painter;
        this.println = deps.println || function() {};
        this._lowestActive = false;

        var self = this;
        this._device.onBandActiveChanged(function(band, isActive) {
            self._onBandActive(band, isActive);
        });
    }

    _onBandActive(band, isActive) {
        if (band === FrequalizerDevice.Band.LOWEST) {
            this._lowestActive = isActive;
            if (isActive) {
                this._painter.paint(13, TwisterPalette.blue1);
                this._painter.paint(14, TwisterPalette.blue1);
            } else {
                this._painter.off(13);
                this._painter.off(14);
            }
        }
    }

    feed(id, value) { return this._device.feed(id, value); }

    handleClick(encoder) {
        if (encoder === 13) {
            return {
                paramId: FrequalizerDevice.PARAM_IDS.Q1_ACTIVE,
                value: this._lowestActive ? 0.0 : 1.0
            };
        }
        return null;
    }
}

if (typeof module !== 'undefined') module.exports = FrequalizerTwisterMapper;
