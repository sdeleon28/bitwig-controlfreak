/**
 * Device control quadrant - replaces bottom-left track grid when a device is focused.
 * Provides exit, bypass, and solo buttons on pads 14-16, with pads 1-13 available
 * for device-specific behaviors via a pad mapper.
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
        this._activePadMapper = null;
    }

    /**
     * Activate device quadrant mode.
     * Unlinks track grid pads, registers device control behaviors, paints pads.
     * @param {Function} onExitCallback - Called when user exits device mode (pad 16)
     * @param {Object} [padMapper] - Optional pad mapper instance with activate/deactivate/etc.
     */
    activate(onExitCallback, padMapper) {
        this._active = true;
        this._onExitCallback = onExitCallback || null;
        this._activePadMapper = padMapper || null;

        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();

        // Unlink all 16 track grid pads and clear stale behaviors
        for (var i = 0; i < pads.length; i++) {
            this.launchpad.unlinkPad(pads[i]);
            this.launchpad.clearPadBehavior(pads[i]);
        }

        // Paint pads 1-13 dark (available for device-specific use)
        for (var i = 0; i < 13; i++) {
            this.pager.requestPaint(page, pads[i], this.launchpad.colors.off);
        }

        // Pad 14 (index 13) = bypass toggle
        this._paintBypassPad();
        var self = this;
        this.launchpad.registerPadBehavior(pads[13], function() {
            self.bitwig.getCursorDevice().isEnabled().toggle();
        }, null, this.pageNumber);

        // Pad 15 (index 14) = solo toggle
        this._paintSoloPad();
        this.launchpad.registerPadBehavior(pads[14], function() {
            self.bitwig.getCursorTrack().solo().toggle();
        }, null, this.pageNumber);

        // Pad 16 (index 15) = exit device mode
        this.pager.requestPaint(page, pads[15], this.launchpad.getBrightnessVariant(this.launchpad.colors.white, this.launchpad.brightness.bright));
        this.launchpad.registerPadBehavior(pads[15], function() {
            var cb = self._onExitCallback;
            if (cb) cb();
            if (self._active) self.deactivate();
        }, null, this.pageNumber);

        // Activate pad mapper if provided
        if (this._activePadMapper) {
            this._activePadMapper.activate(this._buildQuadrantApi());
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

        if (this._activePadMapper) {
            this._activePadMapper.deactivate();
            this._activePadMapper = null;
        }

        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();

        for (var i = 0; i < pads.length; i++) {
            this.pager.requestClear(page, pads[i]);
            this.launchpad.clearPadBehavior(pads[i]);
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
     * Replace the active pad mapper while already active (e.g. when switching devices).
     * Deactivates old mapper, clears pads 1-13, activates new mapper.
     * @param {Object|null} padMapper - New pad mapper instance, or null to clear
     */
    applyPadMapper(padMapper) {
        if (this.debug) this.println("applyPadMapper active=" + this._active + " padMapper=" + (padMapper ? "present" : "null"));
        if (!this._active) return;

        // Deactivate old mapper
        if (this._activePadMapper) {
            this._activePadMapper.deactivate();
        }

        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();

        // Clear device pads (1-13)
        for (var i = 0; i < 13; i++) {
            this.launchpad.clearPadBehavior(pads[i]);
            this.pager.requestPaint(page, pads[i], this.launchpad.colors.off);
        }

        this._activePadMapper = padMapper || null;

        if (this._activePadMapper) {
            this._activePadMapper.activate(this._buildQuadrantApi());
        }
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
     * Forwards to active pad mapper.
     * @param {string} id - Parameter ID
     * @param {number} value - Normalized value (0-1)
     */
    onParamValueChanged(id, value) {
        if (!this._active || !this._activePadMapper) return;
        var normalizedId = id.replace('ROOT_GENERIC_MODULE/', '');
        this._activePadMapper.onParamValueChanged(normalizedId, value);
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
     * Called by Bitwig observer when a direct parameter name is resolved.
     * Forwards to active pad mapper.
     * @param {string} id - Parameter ID
     * @param {string} name - Parameter display name
     */
    onDirectParamNameChanged(id, name) {
        if (!this._active || !this._activePadMapper) return;
        var normalizedId = id.replace('ROOT_GENERIC_MODULE/', '');
        this._activePadMapper.onDirectParamNameChanged(normalizedId, name);
    }

    /**
     * Build a constrained API object for pad mappers.
     * Only exposes pads 1-13 via 1-based indices.
     * @returns {Object} QuadrantAPI
     */
    _buildQuadrantApi() {
        var self = this;
        var pads = this.launchpadQuadrant.bottomLeft.pads;

        return {
            paintPad: function(padIndex, color) {
                self.pager.requestPaint(self.pager.getActivePage(), pads[padIndex - 1], color);
            },
            registerPadBehavior: function(padIndex, callback) {
                self.launchpad.registerPadBehavior(pads[padIndex - 1], callback, null, self.pageNumber);
            },
            resolveParamName: function(name) {
                return self._resolveParamName(name);
            },
            setDeviceParam: function(paramId, value, resolution) {
                self.bitwig.getCursorDevice().setDirectParameterValueNormalized(paramId, value, resolution);
            }
        };
    }

    _paintBypassPad() {
        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();
        if (this._deviceEnabled) {
            this.pager.requestPaint(page, pads[13], this.launchpad.getBrightnessVariant(this.launchpad.colors.green, this.launchpad.brightness.dim));
        } else {
            this.pager.requestPaint(page, pads[13], this.launchpad.getBrightnessVariant(this.launchpad.colors.red, this.launchpad.brightness.bright));
        }
    }

    _paintSoloPad() {
        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();
        if (this._cursorTrackSoloed) {
            this.pager.requestPaint(page, pads[14], this.launchpad.getBrightnessVariant(this.launchpad.colors.yellow, this.launchpad.brightness.dim));
        } else {
            this.pager.requestPaint(page, pads[14], this.launchpad.getBrightnessVariant(this.launchpad.colors.yellow, this.launchpad.brightness.bright));
        }
    }
}

var DeviceQuadrant = {};
if (typeof module !== 'undefined') module.exports = DeviceQuadrantHW;
