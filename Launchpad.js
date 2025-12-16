/**
 * Launchpad hardware abstraction
 * @namespace
 */
var Launchpad = {
    // Hold timing configuration (milliseconds)
    holdTiming: {
        hold: 400  // Time to hold button before triggering hold action
    },

    // Launchpad color constants
    colors: {
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
    },

    // Top row button CC numbers (circular buttons above grid)
    buttons: {
        top1: 104, top2: 105, top3: 106, top4: 107,
        top5: 108, top6: 109, top7: 110, top8: 111
    },

    // Brightness levels enum
    brightness: {
        dim: 'dim',
        bright: 'bright'
    },

    // Color brightness variants (dim and bright for each base color)
    colorVariants: {
        21: { dim: 19, bright: 23 },  // green
        5: { dim: 4, bright: 6 },      // red
        17: { dim: 11, bright: 9 },    // amber
        13: { dim: 12, bright: 14 },   // yellow
        45: { dim: 44, bright: 46 },   // blue
        41: { dim: 40, bright: 42 },   // cyan
        49: { dim: 48, bright: 50 },   // purple
        53: { dim: 4, bright: 95 },    // pink (dim is the nice pink we found!)
        3: { dim: 1, bright: 2 }       // white (trying inverted pattern)
    },

    /**
     * Internal reference to MIDI output
     * @private
     */
    _output: null,

    /**
     * Pad-to-track links
     * @private
     */
    _padLinks: {},

    /**
     * Track-to-pad reverse mapping
     * @private
     */
    _padToTrack: {},

    /**
     * Pad interaction tracking for click/hold behaviors
     * @private
     */
    _padTimers: {},

    /**
     * Clear all registered pad behaviors
     */
    clearAllPadBehaviors: function() {
        this._padTimers = {};
    },

    /**
     * Initialize Launchpad hardware
     * @param {Object} midiOutput - MIDI output port
     */
    init: function(midiOutput) {
        this._output = midiOutput;
        if (debug) println("Launchpad initialized: " + (midiOutput ? "Connected" : "NULL"));
    },

    /**
     * Set pad color
     * @param {number} padNumber - MIDI note number for pad
     * @param {number|string} color - Color value or color name from Launchpad.colors
     */
    setPadColor: function(padNumber, color) {
        if (!this._output) {
            if (debug) println("Warning: Launchpad not initialized");
            return;
        }

        var colorValue = color;

        // If color is a string, look it up in colors object
        if (typeof color === 'string') {
            colorValue = this.colors[color];
            if (colorValue === undefined) {
                if (debug) println("Warning: Unknown color '" + color + "'");
                return;
            }
        }

        this._output.sendMidi(0x90, padNumber, colorValue);
    },

    /**
     * Set pad color with flashing effect (hardware-accelerated)
     * Flashing alternates on/off at MIDI clock rate (or 120 BPM if no clock)
     * @param {number} padNumber - MIDI note number
     * @param {number|string} color - Color value or color name
     */
    setPadColorFlashing: function(padNumber, color) {
        if (!this._output) return;
        var colorValue = typeof color === 'string' ? this.colors[color] : color;
        this._output.sendMidi(0x90, padNumber, 0);  // Clear static first
        this._output.sendMidi(0x91, padNumber, colorValue);  // Channel 2 = Flashing
    },

    /**
     * Set pad color with pulsing effect (hardware-accelerated)
     * Pulsing fades in/out over 2 beats at MIDI clock rate
     * @param {number} padNumber - MIDI note number
     * @param {number|string} color - Color value or color name
     */
    setPadColorPulsing: function(padNumber, color) {
        if (!this._output) return;
        var colorValue = typeof color === 'string' ? this.colors[color] : color;
        this._output.sendMidi(0x92, padNumber, colorValue);  // Channel 3 = Pulsing
    },

    /**
     * Set top button color (uses CC message instead of note)
     * @param {number} ccNumber - CC number for button
     * @param {number|string} color - Color value or color name
     */
    setTopButtonColor: function(ccNumber, color) {
        if (!this._output) {
            if (debug) println("Warning: Launchpad not initialized");
            return;
        }

        var colorValue = color;

        // If color is a string, look it up in colors object
        if (typeof color === 'string') {
            colorValue = this.colors[color];
            if (colorValue === undefined) {
                if (debug) println("Warning: Unknown color '" + color + "'");
                return;
            }
        }

        // Top buttons use CC messages (0xB0) not note messages
        this._output.sendMidi(0xB0, ccNumber, colorValue);
    },

    /**
     * Clear a pad (turn it off)
     * @param {number} padNumber - MIDI note number for pad
     */
    clearPad: function(padNumber) {
        this.setPadColor(padNumber, this.colors.off);
    },

    /**
     * Clear all pads
     */
    clearAll: function() {
        if (!this._output) return;

        for (var i = 0; i < 128; i++) {
            this.clearPad(i);
        }
    },

    /**
     * Enter programmer mode (required for Launchpad MK2)
     * SysEx: F0h 00h 20h 29h 02h 18h 21h 01h F7h
     */
    enterProgrammerMode: function() {
        if (!this._output) return;

        this._output.sendSysex("F0 00 20 29 02 18 21 01 F7");
        if (debug) println("Launchpad entered programmer mode");
    },

    /**
     * Exit programmer mode and return to Live mode
     * SysEx: F0h 00h 20h 29h 02h 18h 21h 00h F7h
     */
    exitProgrammerMode: function() {
        if (!this._output) return;

        this._output.sendSysex("F0 00 20 29 02 18 21 00 F7");
        if (debug) println("Launchpad exited programmer mode");
    },

    /**
     * Set multiple pads at once
     * @param {Object} padColors - Object mapping pad numbers to colors
     */
    setPads: function(padColors) {
        for (var pad in padColors) {
            if (padColors.hasOwnProperty(pad)) {
                this.setPadColor(parseInt(pad), padColors[pad]);
            }
        }
    },

    /**
     * Flash a pad (for visual feedback)
     * @param {number} padNumber - MIDI note number for pad
     * @param {number} color - Color to flash
     * @param {number} duration - Duration in milliseconds
     */
    flashPad: function(padNumber, color, duration) {
        var self = this;
        var originalColor = this.colors.off; // Store original state

        // Set flash color
        this.setPadColor(padNumber, color);

        // Restore after duration
        host.scheduleTask(function() {
            self.clearPad(padNumber);
        }, null, duration || 100);
    },

    /**
     * Map Bitwig RGB color to Launchpad color value
     * @param {number} red - Red component (0-1)
     * @param {number} green - Green component (0-1)
     * @param {number} blue - Blue component (0-1)
     * @returns {number} Launchpad color value (0-127)
     */
    bitwigColorToLaunchpad: function(red, green, blue) {
        var r = red > 0.5;
        var g = green > 0.5;
        var b = blue > 0.5;

        if (r && g && !b) return this.colors.yellow;
        if (r && !g && !b) return this.colors.red;
        if (!r && g && !b) return this.colors.green;
        if (!r && !g && b) return this.colors.blue;
        if (r && g && b) return this.colors.white;
        if (!r && g && b) return this.colors.cyan;
        if (r && !g && b) return this.colors.purple;
        return this.colors.amber;
    },

    /**
     * Get a brightness variant of a color
     * @param {number} baseColorValue - Base color value (0-127)
     * @param {string} brightnessLevel - Brightness level: 'dim' or 'bright' (use Launchpad.brightness.dim or .bright)
     * @returns {number} Adjusted color value (0-127)
     */
    getBrightnessVariant: function(baseColorValue, brightnessLevel) {
        // Look up variant in colorVariants table
        var variants = this.colorVariants[baseColorValue];

        if (variants && brightnessLevel) {
            // Return the requested brightness variant
            return variants[brightnessLevel] || baseColorValue;
        }

        // Fallback: return base color if no variant found
        return baseColorValue;
    },

    /**
     * Link a pad to a track for color feedback
     * @param {number} padNumber - MIDI note number for pad
     * @param {number} trackId - Track ID (0-63)
     * @param {number} pageNumber - Page number for paint request (optional, defaults to active page)
     */
    linkPadToTrack: function(padNumber, trackId, pageNumber) {
        var track = Bitwig.getTrack(trackId);
        if (!track) return;

        // Store link
        this._padLinks[padNumber] = {
            trackId: trackId,
            track: track
        };
        this._padToTrack[trackId] = padNumber;

        // Set color using centralized function
        var color = this.getTrackGridPadColor(trackId);

        Pager.requestPaint(pageNumber, padNumber, color);
    },

    /**
     * Get appropriate color for a track grid pad based on current mode and track state
     * @param {number} trackId - Track ID
     * @returns {number} Color value for the pad
     */
    getTrackGridPadColor: function(trackId) {
        var track = Bitwig.getTrack(trackId);
        if (!track) return this.colors.off;

        var padMode = LaunchpadModeSwitcher.getPadMode();

        // Check mode-specific state
        if (padMode === 'mute') {
            if (track.mute().get()) {
                // Muted: bright amber
                return this.getBrightnessVariant(this.colors.amber, this.brightness.bright);
            }
        } else if (padMode === 'solo') {
            if (track.solo().get()) {
                // Soloed: bright yellow
                return this.getBrightnessVariant(this.colors.yellow, this.brightness.bright);
            }
        } else if (padMode === 'recordArm') {
            if (track.arm().get()) {
                // Armed: bright red
                return this.getBrightnessVariant(this.colors.red, this.brightness.bright);
            }
        }

        // Default: show track color (dim variant)
        var color = track.color();
        var launchpadColor = this.bitwigColorToLaunchpad(color.red(), color.green(), color.blue());
        return this.getBrightnessVariant(launchpadColor, this.brightness.dim);
    },

    /**
     * Unlink a pad from its track
     * @param {number} padNumber - MIDI note number for pad
     */
    unlinkPad: function(padNumber) {
        if (this._padLinks[padNumber]) {
            var trackId = this._padLinks[padNumber].trackId;
            delete this._padToTrack[trackId];
            delete this._padLinks[padNumber];
            this.clearPad(padNumber);
        }
    },

    /**
     * Unlink all pads from their tracks
     */
    unlinkAllPads: function() {
        for (var pad in this._padLinks) {
            if (this._padLinks.hasOwnProperty(pad)) {
                this.clearPad(parseInt(pad));
            }
        }
        this._padLinks = {};
        this._padToTrack = {};
    },

    /**
     * Register click/hold behavior for a pad on a specific page
     * @param {number} padNote - MIDI note number
     * @param {Function} clickCallback - Function to call on click
     * @param {Function} holdCallback - Function to call on hold (optional)
     * @param {number} pageNumber - Page this behavior belongs to (required for isolation)
     */
    registerPadBehavior: function(padNote, clickCallback, holdCallback, pageNumber) {
        if (!this._padTimers[padNote]) {
            this._padTimers[padNote] = {};
        }

        this._padTimers[padNote].clickCallback = clickCallback;
        this._padTimers[padNote].holdCallback = holdCallback || null;
        this._padTimers[padNote].pressTime = null;
        this._padTimers[padNote].pageNumber = pageNumber || null;
    },

    /**
     * Handle pad press (called by Controller)
     * Only triggers if behavior belongs to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadPress: function(padNote) {
        var padTimer = this._padTimers[padNote];
        if (!padTimer) return false;  // Not registered

        // Check page ownership - only handle if behavior belongs to current page
        if (padTimer.pageNumber !== null && padTimer.pageNumber !== Pager.getActivePage()) {
            return false;  // Behavior belongs to different page
        }

        // Record when button was pressed
        padTimer.pressTime = Date.now();

        return true;  // Handled
    },

    /**
     * Handle pad release (called by Controller)
     * Only triggers if behavior belongs to current page
     * @param {number} padNote - MIDI note number
     * @returns {boolean} True if handled
     */
    handlePadRelease: function(padNote) {
        var padTimer = this._padTimers[padNote];
        if (!padTimer) return false;  // Not registered

        // Check page ownership - only handle if behavior belongs to current page
        if (padTimer.pageNumber !== null && padTimer.pageNumber !== Pager.getActivePage()) {
            return false;  // Behavior belongs to different page
        }

        // Calculate how long button was held
        var holdDuration = Date.now() - (padTimer.pressTime || 0);

        // Execute hold or click callback based on duration
        if (holdDuration >= this.holdTiming.hold && padTimer.holdCallback) {
            // Was held long enough - trigger hold action
            padTimer.holdCallback();
        } else if (padTimer.clickCallback) {
            // Quick press - trigger click action
            padTimer.clickCallback();
        }

        // Clean up
        padTimer.pressTime = null;

        return true;  // Handled
    }
};
