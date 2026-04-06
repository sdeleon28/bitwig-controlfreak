/**
 * Launchpad hardware abstraction
 */
class LaunchpadHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.midiOutput - MIDI output port (nullable)
     * @param {Object} deps.pager - Pager namespace (may be set after construction)
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.launchpadModeSwitcher - LaunchpadModeSwitcher namespace (may be set after construction)
     * @param {Object} deps.host - Bitwig host
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this._output = deps.midiOutput || null;
        this.pager = deps.pager || null;
        this.bitwig = deps.bitwig || null;
        this.launchpadModeSwitcher = deps.launchpadModeSwitcher || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        // Constants (also available as static for parse-time stub)
        this.colors = LaunchpadHW.COLORS;
        this.buttons = LaunchpadHW.BUTTONS;
        this.brightness = LaunchpadHW.BRIGHTNESS;
        this.colorVariants = LaunchpadHW.COLOR_VARIANTS;
        this.holdTiming = LaunchpadHW.HOLD_TIMING;

        // Instance state
        this._clickTracking = {};
        this._padLinks = {};
        this._padToTrack = {};
        this._padTimers = {};
        this._notePads = {};

        if (this.debug) this.println("Launchpad initialized: " + (this._output ? "Connected" : "NULL"));
    }

    // ---- Public getters (replace private state access) ----

    getPadForTrack(trackId) {
        return this._padToTrack[trackId] || null;
    }

    // ---- Pad color control ----

    setPadColor(padNumber, color) {
        if (!this._output) {
            if (this.debug) this.println("Warning: Launchpad not initialized");
            return;
        }
        var colorValue = color;
        if (typeof color === 'string') {
            colorValue = this.colors[color];
            if (colorValue === undefined) {
                if (this.debug) this.println("Warning: Unknown color '" + color + "'");
                return;
            }
        }
        this._output.sendMidi(0x90, padNumber, colorValue);
    }

    setPadColorFlashing(padNumber, color) {
        if (!this._output) return;
        var colorValue = typeof color === 'string' ? this.colors[color] : color;
        this._output.sendMidi(0x90, padNumber, 0);
        this._output.sendMidi(0x91, padNumber, colorValue);
    }

    setPadColorPulsing(padNumber, color) {
        if (!this._output) return;
        var colorValue = typeof color === 'string' ? this.colors[color] : color;
        this._output.sendMidi(0x92, padNumber, colorValue);
    }

    setTopButtonColor(ccNumber, color) {
        if (!this._output) {
            if (this.debug) this.println("Warning: Launchpad not initialized");
            return;
        }
        var colorValue = color;
        if (typeof color === 'string') {
            colorValue = this.colors[color];
            if (colorValue === undefined) {
                if (this.debug) this.println("Warning: Unknown color '" + color + "'");
                return;
            }
        }
        this._output.sendMidi(0xB0, ccNumber, colorValue);
    }

    clearPad(padNumber) {
        this.setPadColor(padNumber, this.colors.off);
    }

    clearAll() {
        if (!this._output) return;
        for (var i = 0; i < 128; i++) {
            this.clearPad(i);
        }
    }

    clearAllPadBehaviors() {
        this._padTimers = {};
        this._notePads = {};
    }

    clearPadBehavior(padNote) {
        delete this._padTimers[padNote];
        delete this._notePads[padNote];
    }

    // ---- Note pad behavior (immediate press/release for drum pads) ----

    registerNotePad(padNote, onPress, onRelease, pageNumber) {
        this._notePads[padNote] = {
            onPress: onPress,
            onRelease: onRelease || null,
            pageNumber: pageNumber || null
        };
    }

    clearNotePad(padNote) {
        delete this._notePads[padNote];
    }

    handleNotePadPress(padNote) {
        var notePad = this._notePads[padNote];
        if (!notePad) return false;
        if (notePad.pageNumber !== null && notePad.pageNumber !== this.pager.getActivePage()) {
            return false;
        }
        if (notePad.onPress) notePad.onPress();
        return true;
    }

    handleNotePadRelease(padNote) {
        var notePad = this._notePads[padNote];
        if (!notePad) return false;
        if (notePad.pageNumber !== null && notePad.pageNumber !== this.pager.getActivePage()) {
            return false;
        }
        if (notePad.onRelease) notePad.onRelease();
        return true;
    }

    // ---- SysEx mode control ----

    enterProgrammerMode() {
        if (!this._output) return;
        this._output.sendSysex("F0 00 20 29 02 18 21 01 F7");
        if (this.debug) this.println("Launchpad entered programmer mode");
    }

    exitProgrammerMode() {
        if (!this._output) return;
        this._output.sendSysex("F0 00 20 29 02 18 21 00 F7");
        if (this.debug) this.println("Launchpad exited programmer mode");
    }

    // ---- Batch operations ----

    setPads(padColors) {
        for (var pad in padColors) {
            if (padColors.hasOwnProperty(pad)) {
                this.setPadColor(parseInt(pad), padColors[pad]);
            }
        }
    }

    flashPad(padNumber, color, duration) {
        var self = this;
        this.setPadColor(padNumber, color);
        this.host.scheduleTask(function() {
            self.clearPad(padNumber);
        }, null, duration || 100);
    }

    // ---- Color mapping ----

    bitwigColorToLaunchpad(red, green, blue) {
        var r = Math.round(red * 255);
        var g = Math.round(green * 255);
        var b = Math.round(blue * 255);

        // Exact lookup first (quantize to even numbers to absorb float rounding)
        var key = (r >> 1 << 1) + ',' + (g >> 1 << 1) + ',' + (b >> 1 << 1);
        if (LaunchpadHW.BITWIG_TO_LAUNCHPAD[key] !== undefined) {
            return LaunchpadHW.BITWIG_TO_LAUNCHPAD[key];
        }

        // Nearest color fallback
        var bestDist = Infinity;
        var bestColor = this.colors.amber;
        var entries = LaunchpadHW.BITWIG_TO_LAUNCHPAD_ENTRIES;
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

    getBrightnessVariant(baseColorValue, brightnessLevel) {
        var variants = this.colorVariants[baseColorValue];
        if (variants && brightnessLevel) {
            return variants[brightnessLevel] || baseColorValue;
        }
        return baseColorValue;
    }

    // ---- Pad-track linking ----

    linkPadToTrack(padNumber, trackId, pageNumber) {
        var track = this.bitwig.getTrack(trackId);
        if (!track) return;
        this._padLinks[padNumber] = {
            trackId: trackId,
            track: track
        };
        this._padToTrack[trackId] = padNumber;
        var color = this.getTrackGridPadColor(trackId);
        this.pager.requestPaint(pageNumber, padNumber, color);
    }

    getTrackGridPadColor(trackId) {
        var track = this.bitwig.getTrack(trackId);
        if (!track) return this.colors.off;
        var padMode = this.launchpadModeSwitcher.getPadMode();

        if (padMode === 'mute') {
            if (track.mute().get()) {
                return this.getBrightnessVariant(this.colors.amber, this.brightness.dim);
            }
        } else if (padMode === 'solo') {
            if (track.solo().get()) {
                return this.getBrightnessVariant(this.colors.yellow, this.brightness.dim);
            }
        } else if (padMode === 'recordArm') {
            if (track.arm().get()) {
                return this.getBrightnessVariant(this.colors.red, this.brightness.dim);
            }
        }

        var color = track.color();
        var launchpadColor = this.bitwigColorToLaunchpad(color.red(), color.green(), color.blue());
        return this.getBrightnessVariant(launchpadColor, this.brightness.bright);
    }

    unlinkPad(padNumber) {
        if (this._padLinks[padNumber]) {
            var trackId = this._padLinks[padNumber].trackId;
            delete this._padToTrack[trackId];
            delete this._padLinks[padNumber];
            this.clearPad(padNumber);
        }
    }

    unlinkAllPads() {
        for (var pad in this._padLinks) {
            if (this._padLinks.hasOwnProperty(pad)) {
                this.clearPad(parseInt(pad));
            }
        }
        this._padLinks = {};
        this._padToTrack = {};
    }

    // ---- Pad behavior (click/hold) ----

    registerPadBehavior(padNote, clickCallback, holdCallback, pageNumber) {
        if (!this._padTimers[padNote]) {
            this._padTimers[padNote] = {};
        }
        this._padTimers[padNote].clickCallback = clickCallback;
        this._padTimers[padNote].holdCallback = holdCallback || null;
        this._padTimers[padNote].pressTime = null;
        this._padTimers[padNote].pageNumber = pageNumber || null;
    }

    handlePadPress(padNote) {
        var padTimer = this._padTimers[padNote];
        if (!padTimer) return false;
        if (padTimer.pageNumber !== null && padTimer.pageNumber !== this.pager.getActivePage()) {
            return false;
        }
        padTimer.pressTime = Date.now();
        return true;
    }

    handlePadRelease(padNote) {
        var padTimer = this._padTimers[padNote];
        if (!padTimer) return false;
        if (padTimer.pageNumber !== null && padTimer.pageNumber !== this.pager.getActivePage()) {
            return false;
        }
        var holdDuration = Date.now() - (padTimer.pressTime || 0);

        if (holdDuration >= this.holdTiming.hold && padTimer.holdCallback) {
            padTimer.holdCallback();
        } else if (padTimer.clickCallback) {
            padTimer.clickCallback();
        }
        padTimer.pressTime = null;
        return true;
    }

    // ---- Multi-click tracking ----

    trackPadPress(padNote) {
        if (!this._clickTracking[padNote]) {
            this._clickTracking[padNote] = {
                pressTime: null,
                clickCount: 0,
                lastClickTime: 0
            };
        }
        this._clickTracking[padNote].pressTime = Date.now();
    }

    trackPadRelease(padNote) {
        var tracking = this._clickTracking[padNote];
        if (!tracking) return null;

        var now = Date.now();
        if (now - tracking.lastClickTime < this.holdTiming.clickThreshold) {
            tracking.clickCount++;
        } else {
            tracking.clickCount = 1;
        }
        tracking.lastClickTime = now;
        tracking.pressTime = null;

        if (tracking.clickCount >= 3) {
            this.resetClickTracking(padNote);
            return 'triple';
        }
        if (tracking.clickCount >= 2) {
            this.resetClickTracking(padNote);
            return 'double';
        }
        return null;
    }

    resetClickTracking(padNote) {
        if (this._clickTracking[padNote]) {
            this._clickTracking[padNote].clickCount = 0;
            this._clickTracking[padNote].lastClickTime = 0;
            this._clickTracking[padNote].pressTime = null;
        }
    }
}

// Static constants (available at parse time via stub)
LaunchpadHW.COLORS = {
    off: 0,
    green: 21,
    red: 5,
    amber: 17,
    yellow: 13,
    orange: 9,
    lime: 37,
    cyan: 41,
    blue: 45,
    purple: 49,
    pink: 53,
    white: 3
};

LaunchpadHW.BUTTONS = {
    top1: 104, top2: 105, top3: 106, top4: 107,
    top5: 108, top6: 109, top7: 110, top8: 111
};

LaunchpadHW.BRIGHTNESS = {
    dim: 'dim',
    bright: 'bright'
};

LaunchpadHW.COLOR_VARIANTS = {
    21: { dim: 23, bright: 19 },
    5: { dim: 6, bright: 4 },
    17: { dim: 9, bright: 11 },
    13: { dim: 14, bright: 12 },
    45: { dim: 46, bright: 44 },
    41: { dim: 42, bright: 40 },
    49: { dim: 50, bright: 48 },
    53: { dim: 95, bright: 4 },
    3: { dim: 2, bright: 1 }
};

LaunchpadHW.HOLD_TIMING = {
    hold: 400,
    clickThreshold: 400
};

// Bitwig palette RGB (0-255, quantized to even) → Launchpad color code
LaunchpadHW.BITWIG_TO_LAUNCHPAD = {
    // Row 1: grays, muted tones
    '84,84,82':     0,    // dark gray
    '122,122,122':  103,  // medium gray
    '200,200,200':  70,   // light gray
    '134,136,170':  112,  // muted blue-gray
    '162,120,64':   83,   // brown
    '198,158,110':  108,  // tan
    '86,96,198':    69,   // muted blue
    '132,138,224':  49,   // light blue
    '148,72,202':   81,   // purple
    // Row 2: saturated
    '216,56,110':   95,   // hot pink
    '216,46,34':    72,   // red
    '254,86,4':     84,   // orange
    '216,156,14':   99,   // gold
    '114,152,18':   101,  // olive green
    '0,156,68':     87,   // green
    '0,166,146':    34,   // teal
    '0,152,214':    79,   // blue
    '188,118,240':  52,   // violet
    // Row 3: lighter/pastel
    '224,102,142':  53,   // pink
    '236,96,84':    83,   // salmon
    '254,130,60':   108,  // light orange
    '228,182,76':   109,  // yellow
    '160,192,74':   85,   // lime
    '62,184,96':    31,   // mint green
    '66,210,182':   33,   // aqua
    '68,200,254':   41,   // sky blue
    '208,184,218':  56    // lavender
};

// Pre-computed array for nearest-color fallback: [r, g, b, launchpadColor]
LaunchpadHW.BITWIG_TO_LAUNCHPAD_ENTRIES = (function() {
    var map = LaunchpadHW.BITWIG_TO_LAUNCHPAD;
    var entries = [];
    for (var key in map) {
        if (map.hasOwnProperty(key)) {
            var parts = key.split(',');
            entries.push([parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), map[key]]);
        }
    }
    return entries;
})();

// Backward compat stub — exposes constants at parse time for
// LaunchpadModeSwitcher.js and LaunchpadTopButtons.js
var Launchpad = {
    colors: LaunchpadHW.COLORS,
    buttons: LaunchpadHW.BUTTONS,
    brightness: LaunchpadHW.BRIGHTNESS,
    colorVariants: LaunchpadHW.COLOR_VARIANTS,
    holdTiming: LaunchpadHW.HOLD_TIMING
};
if (typeof module !== 'undefined') module.exports = LaunchpadHW;
