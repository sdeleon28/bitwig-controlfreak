/**
 * MIDI Fighter Twister hardware abstraction (Live controller).
 *
 * Stripped down to what the Live script needs:
 *  - Encoder LED + RGB color control
 *  - Static linking from encoders to top-level tracks
 *  - Volume / pan mode for the volume LED ring
 *  - Encoder turn dispatch into the linked track's volume or pan
 */
class TwisterHW {
    constructor(deps) {
        deps = deps || {};
        this._output = deps.midiOutput || null;
        this.bitwig = deps.bitwig || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        // encoderNumber (1..16) -> { trackId, track }
        this._encoderLinks = {};
        // trackId -> encoderNumber
        this._trackToEncoder = {};
        // 'volume' | 'pan'
        this._mode = 'volume';
    }

    // ---- Encoder <-> CC mapping (top-left encoder = #1) ----

    encoderToCC(encoderNumber) {
        if (encoderNumber < 1 || encoderNumber > 16) return 0;
        var encoder0 = encoderNumber - 1;
        var row = Math.floor(encoder0 / 4);
        var col = encoder0 % 4;
        var flippedRow = 3 - row;
        return flippedRow * 4 + col;
    }

    ccToEncoder(cc) {
        var row = Math.floor(cc / 4);
        var col = cc % 4;
        var originalRow = 3 - row;
        return originalRow * 4 + col + 1;
    }

    // ---- LED control ----

    setEncoderLED(encoderNumber, value) {
        if (!this._output) return;
        this._output.sendMidi(0xB0, this.encoderToCC(encoderNumber), value);
    }

    setEncoderColor(encoderNumber, red, green, blue) {
        if (!this._output) return;
        var cc = this.encoderToCC(encoderNumber);
        var idx = this._findClosestColorIndex(red, green, blue);
        this._output.sendMidi(0xB1, cc, idx);
        this._output.sendMidi(0xB2, cc, 47); // ensure visible
    }

    clearEncoder(encoderNumber) {
        this.setEncoderLED(encoderNumber, 0);
        this.setEncoderColor(encoderNumber, 0, 0, 0);
    }

    clearAll() {
        for (var i = 1; i <= 16; i++) {
            this.clearEncoder(i);
        }
    }

    // ---- Linking ----

    linkEncoderToTrack(encoderNumber, trackId) {
        if (encoderNumber < 1 || encoderNumber > 16) return;
        var track = this.bitwig.getTrack(trackId);
        if (!track) return;

        this._encoderLinks[encoderNumber] = { trackId: trackId, track: track };
        this._trackToEncoder[trackId] = encoderNumber;

        this._refreshEncoderForLink(encoderNumber);
    }

    linkEncoderToMaster(encoderNumber, masterTrack) {
        if (!masterTrack) return;
        this._encoderLinks[encoderNumber] = { trackId: null, track: masterTrack, isMaster: true };
        this._refreshEncoderForLink(encoderNumber);
    }

    unlinkEncoder(encoderNumber) {
        var link = this._encoderLinks[encoderNumber];
        if (link && link.trackId !== null && link.trackId !== undefined) {
            delete this._trackToEncoder[link.trackId];
        }
        delete this._encoderLinks[encoderNumber];
        this.clearEncoder(encoderNumber);
    }

    unlinkAll() {
        for (var i = 1; i <= 16; i++) {
            this.unlinkEncoder(i);
        }
    }

    getEncoderForTrack(trackId) {
        return this._trackToEncoder[trackId] || null;
    }

    getLinkedTrack(encoderNumber) {
        var link = this._encoderLinks[encoderNumber];
        return link ? link.track : null;
    }

    // ---- Mode ----

    getMode() { return this._mode; }

    setMode(mode) {
        if (mode !== 'volume' && mode !== 'pan') return;
        this._mode = mode;
        this.refreshAllLEDs();
    }

    // ---- Refresh ----

    refreshAllLEDs() {
        for (var i = 1; i <= 16; i++) {
            this._refreshEncoderForLink(i);
        }
    }

    refreshEncoderForTrack(trackId) {
        var enc = this.getEncoderForTrack(trackId);
        if (enc) this._refreshEncoderForLink(enc);
    }

    _refreshEncoderForLink(encoderNumber) {
        var link = this._encoderLinks[encoderNumber];
        if (!link) return;
        var track = link.track;

        var color = track.color();
        this.setEncoderColor(encoderNumber,
            Math.round(color.red() * 255),
            Math.round(color.green() * 255),
            Math.round(color.blue() * 255));

        if (this._mode === 'pan') {
            this.setEncoderLED(encoderNumber, Math.round(track.pan().get() * 127));
        } else {
            this.setEncoderLED(encoderNumber, Math.round(track.volume().get() * 127));
        }
    }

    // ---- Input ----

    handleEncoderTurn(encoderNumber, value) {
        var link = this._encoderLinks[encoderNumber];
        if (!link) return;
        var normalized = value / 127.0;
        if (this._mode === 'pan') {
            link.track.pan().set(normalized);
        } else {
            link.track.volume().set(normalized);
        }
    }

    handleEncoderPress(encoderNumber, pressed) {
        var link = this._encoderLinks[encoderNumber];
        if (!link) return;
        if (pressed && this.host && link.track.name) {
            this.host.showPopupNotification("Encoder " + encoderNumber + ": " + link.track.name().get());
        }
        if (pressed && link.track.makeVisibleInArranger) {
            link.track.makeVisibleInArranger();
        }
        // Momentary solo: solo while held, un-solo on release.
        if (link.track.solo) {
            link.track.solo().set(pressed);
        }
    }

    // Called by Bitwig observers when a linked track's volume/pan changes
    // (so encoders stay in sync with mouse-driven changes).
    onTrackVolumeChanged(trackId, value) {
        if (this._mode !== 'volume') return;
        var enc = this.getEncoderForTrack(trackId);
        if (enc) this.setEncoderLED(enc, value);
    }

    onTrackPanChanged(trackId, value) {
        if (this._mode !== 'pan') return;
        var enc = this.getEncoderForTrack(trackId);
        if (enc) this.setEncoderLED(enc, value);
    }

    // ---- Color mapping ----

    _findClosestColorIndex(r, g, b) {
        var key = (r >> 1 << 1) + ',' + (g >> 1 << 1) + ',' + (b >> 1 << 1);
        if (TwisterHW.BITWIG_TO_TWISTER[key] !== undefined) {
            return TwisterHW.BITWIG_TO_TWISTER[key];
        }
        var bestDist = Infinity;
        var bestColor = 0;
        var entries = TwisterHW.BITWIG_TO_TWISTER_ENTRIES;
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var dr = r - e[0], dg = g - e[1], db = b - e[2];
            var dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) {
                bestDist = dist;
                bestColor = e[3];
            }
        }
        return bestColor;
    }
}

// Bitwig palette RGB (0-255, quantized to even) → Twister color index.
// Lifted from the existing TwisterHW palette table.
TwisterHW.BITWIG_TO_TWISTER = {
    '84,84,82':     0,
    '122,122,122':  0,
    '200,200,200':  31,
    '134,136,170':  0,
    '162,120,64':   76,
    '198,158,110':  72,
    '86,96,198':    123,
    '132,138,224':  126,
    '148,72,202':   107,
    '216,56,110':   87,
    '216,46,34':    85,
    '254,86,4':     79,
    '216,156,14':   71,
    '114,152,18':   42,
    '0,156,68':     44,
    '0,166,146':    37,
    '0,152,214':    27,
    '188,118,240':  103,
    '224,102,142':  88,
    '236,96,84':    80,
    '254,130,60':   71,
    '228,182,76':   66,
    '160,192,74':   41,
    '62,184,96':    42,
    '66,210,182':   36,
    '68,200,254':   19,
    '208,184,218':  93
};

TwisterHW.BITWIG_TO_TWISTER_ENTRIES = (function() {
    var map = TwisterHW.BITWIG_TO_TWISTER;
    var entries = [];
    for (var key in map) {
        if (map.hasOwnProperty(key)) {
            var parts = key.split(',');
            entries.push([parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), map[key]]);
        }
    }
    return entries;
})();

if (typeof module !== 'undefined') module.exports = TwisterHW;
