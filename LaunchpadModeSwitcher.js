/**
 * Launchpad mode switcher (right-side buttons)
 * @namespace
 */
var LaunchpadModeSwitcher = {
    /**
     * Mode enum for type-safe mode references
     */
    modeEnum: {
        VOLUME: 'volume',
        PAN: 'pan',
        SEND_A: 'sendA',
        SEND_B: 'sendB',
        SELECT: 'select',
        MUTE: 'mute',
        SOLO: 'solo',
        RECORD_ARM: 'recordArm'
    },

    /**
     * Mode definitions with button note numbers and colors
     */
    modes: {
        volume: { note: 89, color: Launchpad.colors.green },      // Top
        pan: { note: 79, color: Launchpad.colors.pink },
        sendA: { note: 69, color: Launchpad.colors.purple },
        sendB: { note: 59, color: Launchpad.colors.purple },
        select: { note: 49, color: Launchpad.colors.white },
        mute: { note: 39, color: Launchpad.colors.amber },
        solo: { note: 29, color: Launchpad.colors.yellow },
        recordArm: { note: 19, color: Launchpad.colors.red }      // Bottom
    },

    /**
     * Mode categories
     */
    encoderModes: ['volume', 'pan'],
    padModes: ['mute', 'solo', 'recordArm', 'sendA', 'select'],

    /**
     * Currently selected encoder mode (volume, pan)
     * @private
     */
    currentEncoderMode: null,

    /**
     * Currently selected pad mode (mute, solo, recordArm, sendA)
     * @private
     */
    currentPadMode: null,

    /**
     * Initialize mode switcher
     */
    init: function() {
        this.currentEncoderMode = 'volume';
        this.currentPadMode = 'recordArm';
    },

    /**
     * Select an encoder mode (volume, pan)
     * @param {string} modeName - Name of the encoder mode
     */
    selectEncoderMode: function(modeName) {
        if (this.encoderModes.indexOf(modeName) === -1) {
            if (debug) println("Warning: Unknown encoder mode '" + modeName + "'");
            return;
        }

        this.currentEncoderMode = modeName;
        this.refresh();

        // Refresh encoder LEDs based on mode
        if (modeName === 'pan') {
            Twister.refreshEncoderLEDsForPan();
        } else if (modeName === 'volume') {
            Twister.refreshEncoderLEDsForVolume();
        }
    },

    /**
     * Select a pad mode (mute, solo, recordArm, sendA)
     * @param {string} modeName - Name of the pad mode
     */
    selectPadMode: function(modeName) {
        if (this.padModes.indexOf(modeName) === -1) {
            if (debug) println("Warning: Unknown pad mode '" + modeName + "'");
            return;
        }

        this.currentPadMode = modeName;
        this.refresh();
        Controller.refreshTrackGrid();
    },

    /**
     * Get current encoder mode
     * @returns {string} Current encoder mode
     */
    getEncoderMode: function() {
        return this.currentEncoderMode;
    },

    /**
     * Get current pad mode
     * @returns {string} Current pad mode
     */
    getPadMode: function() {
        return this.currentPadMode;
    },

    /**
     * Refresh all mode button colors (two lights active: encoder mode + pad mode)
     * @param {number} pageNumber - Page number to paint to (default 1)
     */
    refresh: function(pageNumber) {
        if (typeof pageNumber === 'undefined') pageNumber = 1;

        // Update all button colors
        for (var mode in this.modes) {
            if (this.modes.hasOwnProperty(mode)) {
                var modeConfig = this.modes[mode];
                var isActive = (mode === this.currentEncoderMode || mode === this.currentPadMode);

                if (isActive) {
                    // Bright when active
                    var brightColor = Launchpad.getBrightnessVariant(modeConfig.color, Launchpad.brightness.bright);
                    Pager.requestPaint(pageNumber, modeConfig.note, brightColor);
                } else {
                    // OFF when inactive
                    Pager.requestClear(pageNumber, modeConfig.note);
                }
            }
        }
    },

    /**
     * Get mode name for a button note number
     * @param {number} note - MIDI note number
     * @returns {string|null} Mode name or null
     */
    getModeForNote: function(note) {
        for (var mode in this.modes) {
            if (this.modes.hasOwnProperty(mode)) {
                if (this.modes[mode].note === note) {
                    return mode;
                }
            }
        }
        return null;
    },

    /**
     * Register click and hold behaviors for mode buttons (page 1 only)
     */
    registerBehaviors: function() {
        var self = this;
        var modes = this.modes;
        var page = Page_MainControl.pageNumber;

        // Encoder mode buttons (no hold behavior)
        Launchpad.registerPadBehavior(modes.volume.note, function() {
            self.selectEncoderMode('volume');
        }, null, page);

        Launchpad.registerPadBehavior(modes.pan.note, function() {
            self.selectEncoderMode('pan');
        }, null, page);

        // Pad mode buttons
        Launchpad.registerPadBehavior(modes.mute.note, function() {
            self.selectPadMode('mute');
        }, function() {
            Controller.clearAllMute();
        }, page);

        Launchpad.registerPadBehavior(modes.solo.note, function() {
            self.selectPadMode('solo');
        }, function() {
            Controller.clearAllSolo();
        }, page);

        Launchpad.registerPadBehavior(modes.recordArm.note, function() {
            self.selectPadMode('recordArm');
        }, function() {
            Controller.clearAllArm();
        }, page);

        Launchpad.registerPadBehavior(modes.sendA.note, function() {
            self.selectPadMode('sendA');
        }, null, page);

        // Select mode button (select track + remote controls)
        Launchpad.registerPadBehavior(modes.select.note, function() {
            self.selectPadMode('select');
        }, null, page);

        // Placeholder: sendB has no behavior (stays off)
    }
};
