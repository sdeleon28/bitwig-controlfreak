/**
 * MIDI Fighter Twister hardware abstraction
 */
class TwisterHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.midiOutput - MIDI output port (nullable)
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.launchpadModeSwitcher - LaunchpadModeSwitcher namespace
     * @param {Object} deps.host - Bitwig host
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this._output = deps.midiOutput || null;
        this.bitwig = deps.bitwig || null;
        this.launchpadModeSwitcher = deps.launchpadModeSwitcher || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        // Instance state
        this._encoderLinks = {};
        this._trackToEncoder = {};
        this._sendModeTrackId = null;
        this._sendLinks = {};
        this._sendToEncoder = {};
        this._effectTrackToEncoder = {};
        this._encoderBehaviors = {};
        this._remoteControlMode = false;

        // Constants
        this.colors = TwisterHW.COLORS;
        this.TEMPO_ENCODER = 4;
        this.TEMPO_MIN = 60;
        this.TEMPO_MAX = 230;

        if (this.debug) this.println("Twister initialized: " + (this._output ? "Connected" : "NULL"));
    }

    // ---- Public getters (replace private state access) ----

    getEncoderForTrack(trackId) {
        return this._trackToEncoder[trackId] || null;
    }

    getEncoderForSend(trackId, sendIndex) {
        var key = trackId + '_' + sendIndex;
        return this._sendToEncoder[key] || null;
    }

    getEncoderForEffectTrack(effectIndex) {
        return this._effectTrackToEncoder[effectIndex] || null;
    }

    getEncoderLink(encoderNum) {
        return this._encoderLinks[encoderNum] || null;
    }

    isInRemoteControlMode() {
        return this._remoteControlMode;
    }

    getSendModeTrackId() {
        return this._sendModeTrackId;
    }

    // ---- Encoder <-> CC mapping ----

    encoderToCC(encoderNumber) {
        if (encoderNumber < 1 || encoderNumber > 16) {
            if (this.debug) this.println("Warning: Invalid encoder number " + encoderNumber + " (must be 1-16)");
            return 0;
        }
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
        if (!this._output) {
            if (this.debug) this.println("Warning: Twister not initialized");
            return;
        }
        var cc = this.encoderToCC(encoderNumber);
        this._output.sendMidi(0xB0, cc, value);
    }

    setEncoderColor(encoderNumber, red, green, blue) {
        if (!this._output) {
            if (this.debug) this.println("Warning: Twister not initialized");
            return;
        }
        var cc = this.encoderToCC(encoderNumber);
        var colorIndex = this.findClosestColorIndex(red, green, blue);
        this._output.sendMidi(0xB1, cc, colorIndex);
        this._output.sendMidi(0xB2, cc, 47);  // ensure encoder is visible
    }

    // RGB brightness is controlled via channel 2 (0xB2).
    // Value 17 = off (brightness 0), value 47 = max brightness. Range: 17-47.
    setEncoderBrightness(encoderNumber, value) {
        if (!this._output) {
            if (this.debug) this.println("Warning: Twister not initialized");
            return;
        }
        var cc = this.encoderToCC(encoderNumber);
        this._output.sendMidi(0xB2, cc, value);
    }

    setEncoderOff(encoderNumber) {
        this.setEncoderBrightness(encoderNumber, 17);
    }

    clearEncoder(encoderNumber) {
        this.setEncoderLED(encoderNumber, 0);
        this.setEncoderColor(encoderNumber, 0, 0, 0);
    }

    clearAll() {
        for (var i = 1; i <= 16; i++) {
            this.clearEncoder(i);
        }
        if (this.debug) this.println("All Twister encoders cleared");
    }

    // ---- Link management ----

    unlinkAll() {
        for (var i = 1; i <= 16; i++) {
            this.unlinkEncoder(i);
        }
        this._sendModeTrackId = null;
        this._remoteControlMode = false;
    }

    unlinkEncoder(encoderNumber) {
        if (this._encoderLinks[encoderNumber]) {
            var link = this._encoderLinks[encoderNumber];
            if (link.isEffectTrack) {
                delete this._effectTrackToEncoder[link.effectIndex];
            } else if (link.trackId !== undefined) {
                delete this._trackToEncoder[link.trackId];
            }
            delete this._encoderLinks[encoderNumber];
        }
        if (this._sendLinks[encoderNumber]) {
            var sendLink = this._sendLinks[encoderNumber];
            var key = sendLink.trackId + '_' + sendLink.sendIndex;
            delete this._sendToEncoder[key];
            delete this._sendLinks[encoderNumber];
        }
        if (this._encoderBehaviors[encoderNumber]) {
            delete this._encoderBehaviors[encoderNumber];
        }
        this.clearEncoder(encoderNumber);
    }

    linkEncoderToTrack(encoderNumber, trackId) {
        if (encoderNumber < 1 || encoderNumber > 16) {
            if (this.debug) this.println("Warning: Invalid encoder number " + encoderNumber + " (must be 1-16)");
            return;
        }
        var track = this.bitwig.getTrack(trackId);
        if (!track) {
            if (this.debug) this.println("Warning: Track " + trackId + " not found");
            return;
        }
        this.unlinkEncoder(encoderNumber);
        this._encoderLinks[encoderNumber] = {
            trackId: trackId,
            track: track,
            trackName: track.name().get()
        };
        this._trackToEncoder[trackId] = encoderNumber;

        var volumeValue = track.volume().get();
        var midiValue = Math.round(volumeValue * 127);
        this.setEncoderLED(encoderNumber, midiValue);

        var color = track.color();
        var red = Math.round(color.red() * 255);
        var green = Math.round(color.green() * 255);
        var blue = Math.round(color.blue() * 255);
        this.setEncoderColor(encoderNumber, red, green, blue);
    }

    linkEncoderToSend(encoderNumber, trackId, sendIndex, fxTrack) {
        if (encoderNumber < 1 || encoderNumber > 8) {
            if (this.debug) this.println("Warning: linkEncoderToSend only supports encoders 1-8");
            return;
        }
        var track = this.bitwig.getTrack(trackId);
        if (!track) {
            if (this.debug) this.println("Warning: Track " + trackId + " not found");
            return;
        }
        var send = track.sendBank().getItemAt(sendIndex);
        if (!send) {
            if (this.debug) this.println("Warning: Send " + sendIndex + " not found");
            return;
        }
        this.unlinkEncoder(encoderNumber);
        this._sendLinks[encoderNumber] = {
            trackId: trackId,
            sendIndex: sendIndex,
            send: send
        };
        var key = trackId + '_' + sendIndex;
        this._sendToEncoder[key] = encoderNumber;

        var value = send.value().get();
        this.setEncoderLED(encoderNumber, Math.round(value * 127));

        if (fxTrack) {
            var color = fxTrack.color();
            this.setEncoderColor(encoderNumber,
                Math.round(color.red() * 255),
                Math.round(color.green() * 255),
                Math.round(color.blue() * 255));
        }
        if (this.debug) this.println("Linked encoder " + encoderNumber + " to track " + trackId + " send " + sendIndex);
    }

    linkEncoderToEffectTrack(encoderNumber, effectIndex, track) {
        if (encoderNumber < 9 || encoderNumber > 16) {
            if (this.debug) this.println("Warning: linkEncoderToEffectTrack only supports encoders 9-16");
            return;
        }
        if (!track) {
            if (this.debug) this.println("Warning: Effect track not provided");
            return;
        }
        this.unlinkEncoder(encoderNumber);
        this._effectTrackToEncoder[effectIndex] = encoderNumber;
        this._encoderLinks[encoderNumber] = {
            effectIndex: effectIndex,
            track: track,
            isEffectTrack: true
        };

        var volumeValue = track.volume().get();
        this.setEncoderLED(encoderNumber, Math.round(volumeValue * 127));

        var color = track.color();
        this.setEncoderColor(encoderNumber,
            Math.round(color.red() * 255),
            Math.round(color.green() * 255),
            Math.round(color.blue() * 255));
        if (this.debug) this.println("Linked encoder " + encoderNumber + " to effect track " + effectIndex);
    }

    linkEncodersToTrackSends(trackId) {
        this.unlinkAll();
        this._sendModeTrackId = trackId;
        var fxTracks = this.bitwig.getFxTracks();

        for (var i = 0; i < fxTracks.length && i < 8; i++) {
            var fxNum = fxTracks[i].number;
            var sendIndex = i;
            this.linkEncoderToSend(fxNum, trackId, sendIndex, fxTracks[i].track);
        }
        for (var i = 0; i < fxTracks.length && i < 8; i++) {
            var fxNum = fxTracks[i].number;
            var effectIndex = fxTracks[i].index;
            var fxTrack = fxTracks[i].track;
            this.linkEncoderToEffectTrack(8 + fxNum, effectIndex, fxTrack);
        }
        if (this.debug) this.println("Send mode activated for track " + trackId + " with " + fxTracks.length + " FX tracks");
    }

    linkEncoderToBehavior(encoderNumber, turnCallback, pressCallback, color) {
        if (encoderNumber < 1 || encoderNumber > 16) {
            if (this.debug) this.println("Warning: Invalid encoder number " + encoderNumber + " (must be 1-16)");
            return;
        }
        this.unlinkEncoder(encoderNumber);
        this._encoderBehaviors[encoderNumber] = {
            turnCallback: turnCallback,
            pressCallback: pressCallback
        };
        if (color) {
            this.setEncoderColor(encoderNumber, color.r, color.g, color.b);
        }
        if (this.debug) this.println("Linked encoder " + encoderNumber + " to custom behavior");
    }

    linkEncodersToRemoteControls() {
        this.unlinkAll();
        this._remoteControlMode = true;
        var remoteControls = this.bitwig.getRemoteControls();
        if (!remoteControls) return;
        for (var i = 0; i < 8; i++) {
            var param = remoteControls.getParameter(i);
            var encoderNum = ((i + 4) % 8) + 1;
            var value = param.value().get();
            this.setEncoderLED(encoderNum, Math.round(value * 127));
            this.setEncoderColor(encoderNum, 255, 0, 0);
        }
    }

    // ---- LED refresh ----

    refreshEncoderLEDsForVolume() {
        for (var encoderNum = 1; encoderNum <= 16; encoderNum++) {
            var link = this._encoderLinks[encoderNum];
            if (link) {
                var volumeValue = link.track.volume().get();
                var midiValue = Math.round(volumeValue * 127);
                this.setEncoderLED(encoderNum, midiValue);
            }
        }
    }

    refreshEncoderLEDsForPan() {
        for (var encoderNum = 1; encoderNum <= 16; encoderNum++) {
            var link = this._encoderLinks[encoderNum];
            if (link) {
                var panValue = link.track.pan().get();
                var midiValue = Math.round(panValue * 127);
                this.setEncoderLED(encoderNum, midiValue);
            }
        }
    }

    updateRemoteControlLED(paramIndex, value) {
        if (!this._remoteControlMode) return;
        if (paramIndex < 0 || paramIndex > 7) return;
        var encoderNum = ((paramIndex + 4) % 8) + 1;
        this.setEncoderLED(encoderNum, Math.round(value * 127));
    }

    // ---- Input handling ----

    getLinkedTrack(encoderNumber) {
        var link = this._encoderLinks[encoderNumber];
        return link ? link.track : null;
    }

    handleEncoderTurn(encoderNumber, value) {
        if (this._remoteControlMode && encoderNumber <= 8) {
            var remoteControls = this.bitwig.getRemoteControls();
            if (remoteControls) {
                var paramIndex = ((encoderNumber + 3) % 8);
                remoteControls.getParameter(paramIndex).value().set(value / 127.0);
            }
            return;
        }

        var behavior = this._encoderBehaviors[encoderNumber];
        if (behavior && behavior.turnCallback) {
            behavior.turnCallback(value);
            return;
        }

        var sendLink = this._sendLinks[encoderNumber];
        if (sendLink && this.launchpadModeSwitcher.getPadMode() === 'sendA') {
            sendLink.send.value().set(value / 127.0);
            return;
        }

        var link = this._encoderLinks[encoderNumber];
        if (link && link.isEffectTrack) {
            link.track.volume().set(value / 127.0);
            return;
        }

        var track = this.getLinkedTrack(encoderNumber);
        if (track) {
            var normalizedValue = value / 127.0;
            if (this.launchpadModeSwitcher.getEncoderMode() === 'pan') {
                track.pan().set(normalizedValue);
            } else {
                track.volume().set(normalizedValue);
            }
        }
    }

    handleEncoderPress(encoderNumber, pressed) {
        var behavior = this._encoderBehaviors[encoderNumber];
        if (behavior && behavior.pressCallback) {
            behavior.pressCallback(pressed);
            return;
        }
        var track = this.getLinkedTrack(encoderNumber);
        if (track) {
            if (pressed) {
                this.host.showPopupNotification("Encoder " + encoderNumber + ": " + track.name().get());
            }
            track.solo().set(pressed);
        }
    }

    // ---- Color mapping ----

    findClosestColorIndex(r, g, b) {
        var hue = this._rgbToHue(r, g, b);
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var saturation = (max === 0) ? 0 : (max - min) / max;

        if (this.debug) {
            this.println("Color: RGB(" + r + ", " + g + ", " + b +
                    ") Hue: " + hue.toFixed(1) +
                    "° Sat: " + saturation.toFixed(2) +
                    " Bright: " + max);
        }

        if (saturation < 0.15) {
            if (this.debug) this.println("  -> Grayscale detected");
            return 0;
        }

        if (hue >= 270 && hue <= 330) {
            if (this.debug) this.println("  -> Purple detected, hue: " + hue.toFixed(1));
            var purpleRange = hue - 270;
            var colorIndex = Math.round(105 + (purpleRange * 15 / 60));
            if (this.debug) this.println("  -> Purple mapped to index: " + colorIndex);
            return colorIndex;
        }

        var invertedHue = 360 - hue;
        var adjustedHue = (invertedHue + 240) % 360;
        var colorIndex = Math.round(adjustedHue * 127 / 360);
        if (this.debug) this.println("  -> Index: " + colorIndex);
        return colorIndex;
    }

    _rgbToHue(r, g, b) {
        r = r / 255;
        g = g / 255;
        b = b / 255;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var delta = max - min;

        if (delta === 0) return 0;

        var hue;
        if (max === r) {
            hue = 60 * (((g - b) / delta) % 6);
        } else if (max === g) {
            hue = 60 * (((b - r) / delta) + 2);
        } else {
            hue = 60 * (((r - g) / delta) + 4);
        }
        if (hue < 0) hue += 360;
        return hue;
    }
}

TwisterHW.COLORS = [
    {idx: 0,   r: 0,   g: 0,   b: 0},
    {idx: 1,   r: 40,  g: 40,  b: 40},
    {idx: 5,   r: 0,   g: 0,   b: 200},
    {idx: 7,   r: 0,   g: 150, b: 255},
    {idx: 9,   r: 0,   g: 200, b: 200},
    {idx: 11,  r: 0,   g: 255, b: 150},
    {idx: 13,  r: 0,   g: 255, b: 0},
    {idx: 15,  r: 150, g: 255, b: 0},
    {idx: 17,  r: 255, g: 255, b: 0},
    {idx: 19,  r: 255, g: 180, b: 0},
    {idx: 21,  r: 255, g: 100, b: 0},
    {idx: 23,  r: 255, g: 50,  b: 0},
    {idx: 25,  r: 255, g: 0,   b: 0},
    {idx: 27,  r: 255, g: 0,   b: 100},
    {idx: 29,  r: 255, g: 0,   b: 200},
    {idx: 31,  r: 255, g: 0,   b: 255},
    {idx: 33,  r: 200, g: 0,   b: 255},
    {idx: 35,  r: 150, g: 0,   b: 255},
    {idx: 37,  r: 100, g: 0,   b: 200}
];

var Twister = {};
if (typeof module !== 'undefined') module.exports = TwisterHW;
