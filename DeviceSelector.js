/**
 * Device selector quadrant - shows devices on the cursor track for selection.
 * Replaces bottom-left track grid when in track mode.
 * Pads 1-12: device slots, Pads 13-14: reserved, Pad 15: solo toggle, Pad 16: exit.
 */
class DeviceSelectorHW {
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
        this._onDeviceSelected = null;
        this._onExit = null;
        this._deviceExists = [];
        this._deviceNames = [];
        this._cursorDevicePosition = -1;
        this._cursorTrackSoloed = false;

        for (var i = 0; i < 12; i++) {
            this._deviceExists[i] = false;
            this._deviceNames[i] = '';
        }
    }

    /**
     * Activate device selector mode.
     * @param {Function} onDeviceSelected - Called with device index when user selects a device
     * @param {Function} onExit - Called when user exits to grid
     */
    activate(onDeviceSelected, onExit) {
        this._active = true;
        this._onDeviceSelected = onDeviceSelected || null;
        this._onExit = onExit || null;

        // Sync device existence from Bitwig to avoid stale observer state
        var deviceBank = this.bitwig.getDeviceBank();
        if (deviceBank) {
            for (var i = 0; i < 12; i++) {
                this._deviceExists[i] = deviceBank.getItemAt(i).exists().get();
            }
        }

        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();

        // Unlink all 16 pads and clear stale behaviors
        for (var i = 0; i < pads.length; i++) {
            this.launchpad.unlinkPad(pads[i]);
            this.launchpad.clearPadBehavior(pads[i]);
        }

        // Paint device pads (1-12)
        this._paintDevicePads();

        // Pad 13 (index 12) = reserved (dark)
        this.pager.requestPaint(page, pads[12], this.launchpad.colors.off);

        // Pad 14 (index 13) = reserved (dark)
        this.pager.requestPaint(page, pads[13], this.launchpad.colors.off);

        // Pad 15 (index 14) = solo toggle
        this._paintSoloPad();
        var self = this;
        this.launchpad.registerPadBehavior(pads[14], function() {
            self.bitwig.getCursorTrack().solo().toggle();
        }, null, this.pageNumber);

        // Pad 16 (index 15) = exit to grid
        this.pager.requestPaint(page, pads[15], this.launchpad.getBrightnessVariant(this.launchpad.colors.white, this.launchpad.brightness.bright));
        this.launchpad.registerPadBehavior(pads[15], function() {
            var cb = self._onExit;
            self.deactivate();
            if (cb) cb();
        }, null, this.pageNumber);

        if (this.debug) this.println("DeviceSelector activated");
    }

    /**
     * Deactivate device selector mode.
     */
    deactivate() {
        if (!this._active) return;
        this._active = false;
        this._onDeviceSelected = null;
        this._onExit = null;

        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();

        for (var i = 0; i < pads.length; i++) {
            this.pager.requestClear(page, pads[i]);
            this.launchpad.clearPadBehavior(pads[i]);
        }

        if (this.debug) this.println("DeviceSelector deactivated");
    }

    /**
     * @returns {boolean} Whether device selector is currently active
     */
    isActive() {
        return this._active;
    }

    /**
     * Called by Bitwig observer when device existence changes.
     * @param {number} index - Device index (0-11)
     * @param {boolean} exists - Whether device exists at this slot
     */
    onDeviceExistsChanged(index, exists) {
        if (index < 0 || index >= 12) return;
        this._deviceExists[index] = exists;
        if (this._active) {
            for (var i = 0; i < 12; i++) {
                this._paintDevicePad(i);
            }
        }
    }

    /**
     * Called by Bitwig observer when device name changes.
     * @param {number} index - Device index (0-11)
     * @param {string} name - Device name
     */
    onDeviceNameChanged(index, name) {
        if (index < 0 || index >= 12) return;
        this._deviceNames[index] = name;
    }

    /**
     * Called by Bitwig observer when cursor device position changes.
     * @param {number} position - Position of cursor device in chain
     */
    onCursorDevicePositionChanged(position) {
        var oldPosition = this._cursorDevicePosition;
        this._cursorDevicePosition = position;
        if (this._active) {
            // Repaint old and new position
            if (oldPosition >= 0 && oldPosition < 12) {
                this._paintDevicePad(oldPosition);
            }
            if (position >= 0 && position < 12) {
                this._paintDevicePad(position);
            }
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

    _paintDevicePads() {
        var self = this;
        var pads = this.launchpadQuadrant.bottomLeft.pads;

        for (var i = 0; i < 12; i++) {
            this._paintDevicePad(i);
            // Register click behavior
            (function(deviceIndex) {
                self.launchpad.registerPadBehavior(pads[deviceIndex], function() {
                    if (self._deviceExists[deviceIndex]) {
                        if (self._onDeviceSelected) self._onDeviceSelected(deviceIndex);
                    } else {
                        var ip = self.bitwig.getEndOfChainInsertionPoint();
                        if (ip) ip.browse();
                    }
                }, null, self.pageNumber);
            })(i);
        }
    }

    _isFirstEmptySlot(index) {
        if (this._deviceExists[index]) return false;
        for (var i = 0; i < index; i++) {
            if (!this._deviceExists[i]) return false;
        }
        return true;
    }

    _paintDevicePad(index) {
        var pads = this.launchpadQuadrant.bottomLeft.pads;
        var page = this.pager.getActivePage();

        if (!this._deviceExists[index]) {
            if (this._isFirstEmptySlot(index)) {
                this.pager.requestPaint(page, pads[index], this.launchpad.getBrightnessVariant(this.launchpad.colors.green, this.launchpad.brightness.dim));
            } else {
                this.pager.requestPaint(page, pads[index], this.launchpad.colors.off);
            }
        } else if (index === this._cursorDevicePosition) {
            this.pager.requestPaint(page, pads[index], this.launchpad.getBrightnessVariant(this.launchpad.colors.cyan, this.launchpad.brightness.bright));
        } else {
            this.pager.requestPaint(page, pads[index], this.launchpad.getBrightnessVariant(this.launchpad.colors.cyan, this.launchpad.brightness.dim));
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

var DeviceSelector = {};
if (typeof module !== 'undefined') module.exports = DeviceSelectorHW;
