// ---------------------------------------------------------------------------
// FrequalizerTwisterMapper — Wires FrequalizerDevice callbacks to TwisterPainter
// ---------------------------------------------------------------------------

function FrequalizerTwisterMapper(deps) {
    this._device = deps.device;   // FrequalizerDevice instance
    this._painter = deps.painter; // TwisterPainter instance

    var self = this;
    this._device.onBandActiveChanged(function(band, isActive) {
        self._onBandActive(band, isActive);
    });
}

FrequalizerTwisterMapper.prototype._onBandActive = function(band, isActive) {
    if (band === FrequalizerDevice.Band.LOWEST) {
        if (isActive) {
            this._painter.paint(13, TwisterPalette.blue1);
            this._painter.paint(14, TwisterPalette.blue1);
        } else {
            this._painter.off(13);
            this._painter.off(14);
        }
    }
};

FrequalizerTwisterMapper.prototype.feed = function(id, value) {
    return this._device.feed(id, value);
};

if (typeof module !== 'undefined') module.exports = FrequalizerTwisterMapper;
