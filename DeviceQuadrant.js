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
    }

    /**
     * Activate device quadrant mode.
     * Unlinks track grid pads, registers device control behaviors, paints pads.
     * @param {Function} onExitCallback - Called when user exits device mode (pad 16)
     */
    activate(onExitCallback) {
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
     * Future extension point for device-specific pad behaviors on pads 1-13.
     * @param {Object} config - Device-specific pad configuration
     */
    registerDevicePads(config) {
        // Reserved for future use
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
