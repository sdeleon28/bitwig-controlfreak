/**
 * Launchpad mode switcher (right-side buttons)
 */
class LaunchpadModeSwitcherHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.twister - Twister instance
     * @param {Object} deps.controller - Controller namespace
     * @param {Object} deps.pageMainControl - Page_MainControl namespace
     * @param {Object} deps.host - Bitwig host
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.launchpad = deps.launchpad || null;
        this.pager = deps.pager || null;
        this.twister = deps.twister || null;
        this.controller = deps.controller || null;
        this.pageMainControl = deps.pageMainControl || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        var colors = this.launchpad ? this.launchpad.colors : {};

        // Mode definitions with button note numbers and colors
        this.modes = {
            volume:    { note: 89, color: colors.green },
            pan:       { note: 79, color: colors.pink },
            sendA:     { note: 69, color: colors.purple },
            sendB:     { note: 59, color: colors.purple },
            select:    { note: 49, color: colors.white },
            mute:      { note: 39, color: colors.amber },
            solo:      { note: 29, color: colors.yellow },
            recordArm: { note: 19, color: colors.red }
        };

        // Mode categories
        this.encoderModes = ['volume', 'pan'];
        this.padModes = ['mute', 'solo', 'recordArm', 'sendA', 'select'];

        // Default modes (replaces init())
        this._currentEncoderMode = 'volume';
        this._currentPadMode = 'recordArm';

        if (this.debug) this.println("LaunchpadModeSwitcher initialized");
    }

    /**
     * Select an encoder mode (volume, pan)
     */
    selectEncoderMode(modeName) {
        if (this.encoderModes.indexOf(modeName) === -1) {
            if (this.debug) this.println("Warning: Unknown encoder mode '" + modeName + "'");
            return;
        }

        this._currentEncoderMode = modeName;
        if (this.host) this.host.showPopupNotification("Encoder: " + this._modeLabel(modeName));
        this.refresh();

        // Refresh encoder LEDs based on mode
        if (this.twister) {
            if (modeName === 'pan') {
                this.twister.refreshEncoderLEDsForPan();
            } else if (modeName === 'volume') {
                this.twister.refreshEncoderLEDsForVolume();
            }
        }
    }

    /**
     * Select a pad mode (mute, solo, recordArm, sendA, select)
     */
    selectPadMode(modeName) {
        if (this.padModes.indexOf(modeName) === -1) {
            if (this.debug) this.println("Warning: Unknown pad mode '" + modeName + "'");
            return;
        }

        this._currentPadMode = modeName;
        if (this.host) this.host.showPopupNotification("Pad: " + this._modeLabel(modeName));
        this.refresh();
        if (this.controller) this.controller.refreshTrackGrid();
    }

    getEncoderMode() {
        return this._currentEncoderMode;
    }

    getPadMode() {
        return this._currentPadMode;
    }

    /**
     * Refresh all mode button colors (two lights active: encoder mode + pad mode)
     */
    refresh(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;
        if (!this.launchpad || !this.pager) return;

        for (var mode in this.modes) {
            if (this.modes.hasOwnProperty(mode)) {
                var modeConfig = this.modes[mode];
                var isActive = (mode === this._currentEncoderMode || mode === this._currentPadMode);

                if (isActive) {
                    var brightColor = this.launchpad.getBrightnessVariant(modeConfig.color, this.launchpad.brightness.dim);
                    this.pager.requestPaint(pageNumber, modeConfig.note, brightColor);
                } else {
                    this.pager.requestClear(pageNumber, modeConfig.note);
                }
            }
        }
    }

    _modeLabel(modeName) {
        var labels = {
            volume: 'Volume', pan: 'Pan', mute: 'Mute', solo: 'Solo',
            recordArm: 'Record Arm', sendA: 'Sends', sendB: 'Sends B', select: 'Select'
        };
        return labels[modeName] || modeName;
    }

    /**
     * Get mode name for a button note number
     */
    getModeForNote(note) {
        for (var mode in this.modes) {
            if (this.modes.hasOwnProperty(mode)) {
                if (this.modes[mode].note === note) {
                    return mode;
                }
            }
        }
        return null;
    }

    /**
     * Register click and hold behaviors for mode buttons (page 1 only)
     */
    registerBehaviors() {
        var self = this;
        var modes = this.modes;
        var page = this.pageMainControl ? this.pageMainControl.pageNumber : 1;

        // Encoder mode buttons (no hold behavior)
        this.launchpad.registerPadBehavior(modes.volume.note, function() {
            self.selectEncoderMode('volume');
        }, null, page);

        this.launchpad.registerPadBehavior(modes.pan.note, function() {
            self.selectEncoderMode('pan');
        }, null, page);

        // Pad mode buttons
        this.launchpad.registerPadBehavior(modes.mute.note, function() {
            self.selectPadMode('mute');
        }, function() {
            if (self.controller) self.controller.clearAllMute();
        }, page);

        this.launchpad.registerPadBehavior(modes.solo.note, function() {
            self.selectPadMode('solo');
        }, function() {
            if (self.controller) self.controller.clearAllSolo();
        }, page);

        this.launchpad.registerPadBehavior(modes.recordArm.note, function() {
            self.selectPadMode('recordArm');
        }, function() {
            if (self.controller) self.controller.clearAllArm();
        }, page);

        this.launchpad.registerPadBehavior(modes.sendA.note, function() {
            self.selectPadMode('sendA');
        }, null, page);

        // Select mode button (select track + remote controls)
        this.launchpad.registerPadBehavior(modes.select.note, function() {
            self.selectPadMode('select');
        }, null, page);

        // Placeholder: sendB has no behavior (stays off)
    }
}

LaunchpadModeSwitcherHW.MODE_ENUM = {
    VOLUME: 'volume',
    PAN: 'pan',
    SEND_A: 'sendA',
    SEND_B: 'sendB',
    SELECT: 'select',
    MUTE: 'mute',
    SOLO: 'solo',
    RECORD_ARM: 'recordArm'
};

var LaunchpadModeSwitcher = {
    modeEnum: LaunchpadModeSwitcherHW.MODE_ENUM
};
if (typeof module !== 'undefined') module.exports = LaunchpadModeSwitcherHW;
