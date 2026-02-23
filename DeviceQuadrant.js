/**
 * Device control quadrant - replaces bottom-left track grid when a device is focused.
 * Provides exit, bypass, and solo buttons on pads 14-16, with pads 1-13 available
 * for device-specific behaviors.
 */
class DeviceQuadrantHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {Object} deps.launchpadQuadrant - LaunchpadQuadrant instance
     * @param {Object} deps.pager - Pager instance
     * @param {Object} deps.bitwig - Bitwig instance
     * @param {number} deps.pageNumber - Page number for pad behaviors
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad || null;
        this.launchpadQuadrant = deps.launchpadQuadrant || null;
        this.pager = deps.pager || null;
        this.bitwig = deps.bitwig || null;
        this.pageNumber = deps.pageNumber || 1;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this._active = false;
        this._onExitCallback = null;
        this._deviceEnabled = true;
        this._cursorTrackSoloed = false;
        this._padEntries = [];       // resolved pad config entries [{padNote, paramId, value, resolution, color}]
        this._modeParamId = null;    // tracked param ID for mode highlight
        this._currentModeValue = -1; // current normalized mode value
    }

    /**
     * Activate device quadrant mode.
     * Unlinks track grid pads, registers device control behaviors, paints pads.
     * @param {Function} onExitCallback - Called when user exits device mode (pad 16)
     * @param {Array} [padConfig] - Optional device-specific pad configuration
     */
    activate(onExitCallback, padConfig) {
        this._active = true;
        this._onExitCallback = onExitCallback || null;

        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();

        // Unlink all 16 track grid pads
        for (var i = 0; i < pads.length; i++) {
            this.launchpad.unlinkPad(pads[i]);
        }

        // Paint pads 1-13 dark (available for device-specific use)
        for (var i = 0; i < 13; i++) {
            this.pager.requestPaint(page, pads[i], this.launchpad.colors.off);
        }

        // Pad 14 (index 13) = solo toggle
        this._paintSoloPad();
        var self = this;
        this.launchpad.registerPadBehavior(pads[13], function() {
            self.bitwig.getCursorTrack().solo().toggle();
        }, null, this.pageNumber);

        // Pad 15 (index 14) = bypass toggle
        this._paintBypassPad();
        this.launchpad.registerPadBehavior(pads[14], function() {
            self.bitwig.getCursorDevice().isEnabled().toggle();
        }, null, this.pageNumber);

        // Pad 16 (index 15) = exit device mode
        this.pager.requestPaint(page, pads[15], this.launchpad.getBrightnessVariant(this.launchpad.colors.white, this.launchpad.brightness.dim));
        this.launchpad.registerPadBehavior(pads[15], function() {
            var cb = self._onExitCallback;
            self.deactivate();
            if (cb) cb();
        }, null, this.pageNumber);

        // Apply device-specific pad config (mode buttons etc.)
        if (padConfig) {
            this._applyPadConfig(padConfig);
        }

        if (this.debug) this.println("DeviceQuadrant activated");
    }

    /**
     * Deactivate device quadrant mode.
     * Clears all pads and resets state.
     */
    deactivate() {
        if (!this._active) return;
        this._active = false;
        this._onExitCallback = null;
        this._padEntries = [];
        this._modeParamId = null;
        this._currentModeValue = -1;

        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();

        for (var i = 0; i < pads.length; i++) {
            this.pager.requestClear(page, pads[i]);
        }

        if (this.debug) this.println("DeviceQuadrant deactivated");
    }

    /**
     * @returns {boolean} Whether device quadrant is currently active
     */
    isActive() {
        return this._active;
    }

    /**
     * Called by Bitwig observer when cursor device enabled state changes.
     * @param {boolean} enabled - Whether device is enabled
     */
    onDeviceEnabledChanged(enabled) {
        this._deviceEnabled = enabled;
        if (this._active) {
            this._paintBypassPad();
        }
    }

    /**
     * Called by Bitwig observer when cursor track solo state changes.
     * @param {boolean} soloed - Whether cursor track is soloed
     */
    onCursorTrackSoloChanged(soloed) {
        this._cursorTrackSoloed = soloed;
        if (this._active) {
            this._paintSoloPad();
        }
    }

    /**
     * Called by Bitwig observer when a direct parameter normalized value changes.
     * Updates pad highlights when the tracked mode param changes.
     * @param {string} id - Parameter ID
     * @param {number} value - Normalized value (0-1)
     */
    onParamValueChanged(id, value) {
        if (!this._active || !this._modeParamId || id !== this._modeParamId) return;
        this._currentModeValue = value;
        this._repaintPadHighlights();
    }

    /**
     * Resolve a param name to its ID by searching the name→id map.
     * @param {string} name - Display name of the parameter (e.g. 'Mode')
     * @returns {string|null} Parameter ID or null if not found
     */
    _resolveParamName(name) {
        var names = this.bitwig.getDirectParamNames();
        for (var id in names) {
            if (names[id] === name) return id;
        }
        return null;
    }

    /**
     * Apply device-specific pad configuration.
     * Registers click behaviors for each pad and paints them.
     * @param {Array} padConfig - Array of {pad, paramName, value, resolution, color}
     */
    _applyPadConfig(padConfig) {
        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();
        var device = this.bitwig.getCursorDevice();
        var self = this;

        this._padEntries = [];
        this._modeParamId = null;

        for (var i = 0; i < padConfig.length; i++) {
            var entry = padConfig[i];
            var paramId = this._resolveParamName(entry.paramName);
            if (!paramId) {
                if (this.debug) this.println("DeviceQuadrant: could not resolve param '" + entry.paramName + "'");
                continue;
            }

            var padIndex = entry.pad - 1;
            var padNote = pads[padIndex];
            var normalizedValue = entry.value / (entry.resolution - 1);
            var colorKey = entry.color || 'white';
            var baseColor = this.launchpad.colors[colorKey] || this.launchpad.colors.white;

            this._padEntries.push({
                padNote: padNote,
                paramId: paramId,
                normalizedValue: normalizedValue,
                baseColor: baseColor
            });

            // Track the mode param (all entries share the same param)
            if (!this._modeParamId) {
                this._modeParamId = paramId;
            }

            // Register click: set the parameter to this pad's value
            (function(pid, nv, res) {
                self.launchpad.registerPadBehavior(padNote, function() {
                    device.setDirectParameterValueNormalized(pid, nv, res);
                }, null, self.pageNumber);
            })(paramId, normalizedValue, entry.resolution);

            // Paint dim initially
            this.pager.requestPaint(page, padNote,
                this.launchpad.getBrightnessVariant(baseColor, this.launchpad.brightness.dim));
        }
    }

    /**
     * Repaint all configured pad highlights based on current mode value.
     * Active mode = bright, others = dim.
     */
    _repaintPadHighlights() {
        var page = this.pager.getActivePage();
        var EPSILON = 0.01;
        for (var i = 0; i < this._padEntries.length; i++) {
            var entry = this._padEntries[i];
            var isActive = Math.abs(entry.normalizedValue - this._currentModeValue) < EPSILON;
            var brightness = isActive ? this.launchpad.brightness.bright : this.launchpad.brightness.dim;
            this.pager.requestPaint(page, entry.padNote,
                this.launchpad.getBrightnessVariant(entry.baseColor, brightness));
        }
    }

    _paintBypassPad() {
        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();
        if (this._deviceEnabled) {
            this.pager.requestPaint(page, pads[14], this.launchpad.getBrightnessVariant(this.launchpad.colors.green, this.launchpad.brightness.bright));
        } else {
            this.pager.requestPaint(page, pads[14], this.launchpad.getBrightnessVariant(this.launchpad.colors.red, this.launchpad.brightness.dim));
        }
    }

    _paintSoloPad() {
        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();
        if (this._cursorTrackSoloed) {
            this.pager.requestPaint(page, pads[13], this.launchpad.getBrightnessVariant(this.launchpad.colors.yellow, this.launchpad.brightness.bright));
        } else {
            this.pager.requestPaint(page, pads[13], this.launchpad.getBrightnessVariant(this.launchpad.colors.yellow, this.launchpad.brightness.dim));
        }
    }
}

var DeviceQuadrant = {};
if (typeof module !== 'undefined') module.exports = DeviceQuadrantHW;
