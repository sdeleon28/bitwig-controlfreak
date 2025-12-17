/**
 * MIDI Fighter Twister hardware abstraction
 * @namespace
 */
var Twister = {
    // MIDI Fighter Twister color palette (approximate indices)
    colors: [
    {idx: 0,   r: 0,   g: 0,   b: 0},      // Black/Off
    {idx: 1,   r: 40,  g: 40,  b: 40},     // Dark gray
    {idx: 5,   r: 0,   g: 0,   b: 200},    // Blue
    {idx: 7,   r: 0,   g: 150, b: 255},    // Light blue
    {idx: 9,   r: 0,   g: 200, b: 200},    // Cyan
    {idx: 11,  r: 0,   g: 255, b: 150},    // Cyan-green
    {idx: 13,  r: 0,   g: 255, b: 0},      // Green
    {idx: 15,  r: 150, g: 255, b: 0},      // Lime
    {idx: 17,  r: 255, g: 255, b: 0},      // Yellow
    {idx: 19,  r: 255, g: 180, b: 0},      // Gold
    {idx: 21,  r: 255, g: 100, b: 0},      // Orange
    {idx: 23,  r: 255, g: 50,  b: 0},      // Red-orange
    {idx: 25,  r: 255, g: 0,   b: 0},      // Red
    {idx: 27,  r: 255, g: 0,   b: 100},    // Pink-red
    {idx: 29,  r: 255, g: 0,   b: 200},    // Pink
    {idx: 31,  r: 255, g: 0,   b: 255},    // Magenta
    {idx: 33,  r: 200, g: 0,   b: 255},    // Purple-magenta
    {idx: 35,  r: 150, g: 0,   b: 255},    // Purple
    {idx: 37,  r: 100, g: 0,   b: 200}     // Dark purple
    ],

    /**
     * Internal reference to MIDI output
     * @private
     */
    _output: null,

    /**
     * Encoder-to-track links
     * @private
     */
    _encoderLinks: {},

    /**
     * Track-to-encoder reverse mapping
     * @private
     */
    _trackToEncoder: {},

    /**
     * Track ID when in send mode (null = normal mode)
     * @private
     */
    _sendModeTrackId: null,

    /**
     * Encoder-to-send links: encoderNum -> {trackId, sendIndex, send}
     * @private
     */
    _sendLinks: {},

    /**
     * Reverse mapping: "trackId_sendIndex" -> encoderNum
     * @private
     */
    _sendToEncoder: {},

    /**
     * Effect track index -> encoderNum for FX volume links
     * @private
     */
    _effectTrackToEncoder: {},

    /**
     * Encoder-to-behavior links for custom behaviors (not track-linked)
     * @private
     */
    _encoderBehaviors: {},

    /**
     * Remote control mode active (for select mode)
     * @private
     */
    _remoteControlMode: false,

    /**
     * Encoder used for tempo control in top-level group
     */
    TEMPO_ENCODER: 4,

    /**
     * Tempo range for encoder mapping (BPM)
     */
    TEMPO_MIN: 60,
    TEMPO_MAX: 230,

    /**
     * Initialize Twister hardware
     * @param {Object} midiOutput - MIDI output port
     */
    init: function(midiOutput) {
        this._output = midiOutput;
        if (debug) println("Twister initialized: " + (midiOutput ? "Connected" : "NULL"));
    },

    /**
     * Convert encoder number (1-16) to CC number (0-15)
     * @param {number} encoderNumber - Encoder number (1-16, bottom-left origin)
     * @returns {number} CC number (0-15)
     */
    encoderToCC: function(encoderNumber) {
        if (encoderNumber < 1 || encoderNumber > 16) {
            if (debug) println("Warning: Invalid encoder number " + encoderNumber + " (must be 1-16)");
            return 0;
        }

        // Convert 1-based encoder to 0-based
        var encoder0 = encoderNumber - 1;

        // Calculate row and column (bottom-left = encoder 1)
        var row = Math.floor(encoder0 / 4);  // 0-3, where 0 is bottom
        var col = encoder0 % 4;               // 0-3, left to right

        // Flip vertically (CC numbering starts at top)
        var flippedRow = 3 - row;

        // Calculate CC number
        var cc = flippedRow * 4 + col;

        return cc;
    },

    /**
     * Convert CC number (0-15) to encoder number (1-16)
     * @param {number} cc - CC number (0-15)
     * @returns {number} Encoder number (1-16, bottom-left origin)
     */
    ccToEncoder: function(cc) {
        // CC numbering starts at top-left, goes left-to-right, top-to-bottom
        var row = Math.floor(cc / 4);      // 0-3, where 0 is top
        var col = cc % 4;                   // 0-3, left to right

        // Flip vertically (encoder numbering starts at bottom)
        var originalRow = 3 - row;

        // Calculate encoder number (1-16, bottom-left origin)
        var encoder0 = originalRow * 4 + col;
        var encoderNumber = encoder0 + 1;

        return encoderNumber;
    },

    /**
     * Set encoder LED ring value
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {number} value - LED ring value (0-127)
     */
    setEncoderLED: function(encoderNumber, value) {
        if (!this._output) {
            if (debug) println("Warning: Twister not initialized");
            return;
        }

        var cc = this.encoderToCC(encoderNumber);
        // Send CC on channel 0 to update encoder LED ring
        this._output.sendMidi(0xB0, cc, value);
    },

    /**
     * Set encoder RGB color
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {number} red - Red component (0-255)
     * @param {number} green - Green component (0-255)
     * @param {number} blue - Blue component (0-255)
     */
    setEncoderColor: function(encoderNumber, red, green, blue) {
        if (!this._output) {
            if (debug) println("Warning: Twister not initialized");
            return;
        }

        var cc = this.encoderToCC(encoderNumber);
        var colorIndex = this.findClosestColorIndex(red, green, blue);

        // Send color index on channel 2 (RGB indicator channel)
        this._output.sendMidi(0xB1, cc, colorIndex);
    },

    /**
     * Clear encoder LED and color
     * @param {number} encoderNumber - Encoder number (1-16)
     */
    clearEncoder: function(encoderNumber) {
        this.setEncoderLED(encoderNumber, 0);
        this.setEncoderColor(encoderNumber, 0, 0, 0);
    },

    /**
     * Clear all encoders (visual only)
     */
    clearAll: function() {
        for (var i = 1; i <= 16; i++) {
            this.clearEncoder(i);
        }
        if (debug) println("All Twister encoders cleared");
    },

    /**
     * Unlink all encoders from their tracks and behaviors
     */
    unlinkAll: function() {
        for (var i = 1; i <= 16; i++) {
            this.unlinkEncoder(i);
        }
        // Reset send mode state
        this._sendModeTrackId = null;
        // Reset remote control mode
        this._remoteControlMode = false;
    },

    /**
     * Refresh encoder LEDs for volume mode
     */
    refreshEncoderLEDsForVolume: function() {
        for (var encoderNum = 1; encoderNum <= 16; encoderNum++) {
            var link = this._encoderLinks[encoderNum];
            if (link) {
                var volumeValue = link.track.volume().get();
                var midiValue = Math.round(volumeValue * 127);
                this.setEncoderLED(encoderNum, midiValue);
            }
        }
    },

    /**
     * Refresh encoder LEDs for pan mode
     */
    refreshEncoderLEDsForPan: function() {
        for (var encoderNum = 1; encoderNum <= 16; encoderNum++) {
            var link = this._encoderLinks[encoderNum];
            if (link) {
                var panValue = link.track.pan().get();
                var midiValue = Math.round(panValue * 127);
                this.setEncoderLED(encoderNum, midiValue);
            }
        }
    },

    /**
     * Link an encoder to a track for bi-directional control
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {number} trackId - Track ID in bank (0-63)
     */
    linkEncoderToTrack: function(encoderNumber, trackId) {
        var self = this;

        // Validate encoder number
        if (encoderNumber < 1 || encoderNumber > 16) {
            if (debug) println("Warning: Invalid encoder number " + encoderNumber + " (must be 1-16)");
            return;
        }

        // Get the track
        var track = Bitwig.getTrack(trackId);
        if (!track) {
            if (debug) println("Warning: Track " + trackId + " not found");
            return;
        }

        // Clean up any existing link for this encoder
        this.unlinkEncoder(encoderNumber);

        // Store the link
        this._encoderLinks[encoderNumber] = {
            trackId: trackId,
            track: track,
            trackName: track.name().get()
        };

        // Store reverse mapping
        this._trackToEncoder[trackId] = encoderNumber;

        // Initial sync (observers are set up globally in init())
        var volumeValue = track.volume().get();
        var midiValue = Math.round(volumeValue * 127);
        this.setEncoderLED(encoderNumber, midiValue);

        var color = track.color();
        var red = Math.round(color.red() * 255);
        var green = Math.round(color.green() * 255);
        var blue = Math.round(color.blue() * 255);
        this.setEncoderColor(encoderNumber, red, green, blue);

    },

    /**
     * Link an encoder to a track's send (for Send A mode)
     * @param {number} encoderNumber - Encoder number (1-8 for sends)
     * @param {number} trackId - Source track ID
     * @param {number} sendIndex - Send index (0-7)
     * @param {Object} fxTrack - FX track object for color
     */
    linkEncoderToSend: function(encoderNumber, trackId, sendIndex, fxTrack) {
        if (encoderNumber < 1 || encoderNumber > 8) {
            if (debug) println("Warning: linkEncoderToSend only supports encoders 1-8");
            return;
        }

        var track = Bitwig.getTrack(trackId);
        if (!track) {
            if (debug) println("Warning: Track " + trackId + " not found");
            return;
        }

        var send = track.sendBank().getItemAt(sendIndex);
        if (!send) {
            if (debug) println("Warning: Send " + sendIndex + " not found");
            return;
        }

        // Clean up any existing link for this encoder
        this.unlinkEncoder(encoderNumber);

        // Store send link
        this._sendLinks[encoderNumber] = {
            trackId: trackId,
            sendIndex: sendIndex,
            send: send
        };

        // Reverse mapping for observer
        var key = trackId + '_' + sendIndex;
        this._sendToEncoder[key] = encoderNumber;

        // Initial LED sync
        var value = send.value().get();
        this.setEncoderLED(encoderNumber, Math.round(value * 127));

        // Set color from FX track
        if (fxTrack) {
            var color = fxTrack.color();
            this.setEncoderColor(encoderNumber,
                Math.round(color.red() * 255),
                Math.round(color.green() * 255),
                Math.round(color.blue() * 255));
        }

        if (debug) println("Linked encoder " + encoderNumber + " to track " + trackId + " send " + sendIndex);
    },

    /**
     * Link an encoder to an effect track's volume (for Send A mode top row)
     * @param {number} encoderNumber - Encoder number (9-16 for FX volumes)
     * @param {number} effectIndex - Index in effect track bank (0-7)
     * @param {Object} track - Effect track object
     */
    linkEncoderToEffectTrack: function(encoderNumber, effectIndex, track) {
        if (encoderNumber < 9 || encoderNumber > 16) {
            if (debug) println("Warning: linkEncoderToEffectTrack only supports encoders 9-16");
            return;
        }

        if (!track) {
            if (debug) println("Warning: Effect track not provided");
            return;
        }

        this.unlinkEncoder(encoderNumber);

        // Store mapping for observer
        this._effectTrackToEncoder[effectIndex] = encoderNumber;

        // Store link info
        this._encoderLinks[encoderNumber] = {
            effectIndex: effectIndex,
            track: track,
            isEffectTrack: true
        };

        // Initial LED sync
        var volumeValue = track.volume().get();
        this.setEncoderLED(encoderNumber, Math.round(volumeValue * 127));

        // Set color
        var color = track.color();
        this.setEncoderColor(encoderNumber,
            Math.round(color.red() * 255),
            Math.round(color.green() * 255),
            Math.round(color.blue() * 255));

        if (debug) println("Linked encoder " + encoderNumber + " to effect track " + effectIndex);
    },

    /**
     * Link all encoders to a track's sends and FX volumes (Send A mode)
     * Bottom 8 encoders: sends from track to FX [1]-[8]
     * Top 8 encoders: FX track volumes
     * @param {number} trackId - Track ID to link sends from
     */
    linkEncodersToTrackSends: function(trackId) {
        this.unlinkAll();
        this._sendModeTrackId = trackId;

        var fxTracks = Bitwig.getFxTracks();

        // Bottom 8 encoders: sends from track to FX [1]-[8]
        // Send index is based on FX track order (i), encoder position from [N] naming
        for (var i = 0; i < fxTracks.length && i < 8; i++) {
            var fxNum = fxTracks[i].number;  // [N] from track name -> encoder position
            var sendIndex = i;                // Send index based on FX track order
            this.linkEncoderToSend(fxNum, trackId, sendIndex, fxTracks[i].track);
        }

        // Top 8 encoders: FX track volumes (effect tracks)
        for (var i = 0; i < fxTracks.length && i < 8; i++) {
            var fxNum = fxTracks[i].number;
            var effectIndex = fxTracks[i].index;
            var fxTrack = fxTracks[i].track;
            // Link encoder (8 + fxNum) to effect track volume
            this.linkEncoderToEffectTrack(8 + fxNum, effectIndex, fxTrack);
        }

        if (debug) println("Send mode activated for track " + trackId + " with " + fxTracks.length + " FX tracks");
    },

    /**
     * Link encoders 1-8 to remote controls of selected track's device
     */
    linkEncodersToRemoteControls: function() {
        this.unlinkAll();
        this._remoteControlMode = true;

        var remoteControls = Bitwig.getRemoteControls();
        if (!remoteControls) {
            if (debug) println("No remote controls available");
            return;
        }

        // Link bottom 8 encoders to remote control params
        // Bitwig params 1-4 (top row) -> encoders 5-8 (second row)
        // Bitwig params 5-8 (bottom row) -> encoders 1-4 (bottom row)
        for (var i = 0; i < 8; i++) {
            var param = remoteControls.getParameter(i);
            var encoderNum = ((i + 4) % 8) + 1;
            // Initial LED sync
            var value = param.value().get();
            this.setEncoderLED(encoderNum, Math.round(value * 127));
            // Blue color for remote controls
            this.setEncoderColor(encoderNum, 80, 80, 255);
        }

        if (debug) println("Remote control mode activated");
    },

    /**
     * Update LED for remote control parameter (called by observer)
     * @param {number} paramIndex - Parameter index (0-7)
     * @param {number} value - Normalized value (0-1)
     */
    updateRemoteControlLED: function(paramIndex, value) {
        if (!this._remoteControlMode) return;
        if (paramIndex < 0 || paramIndex > 7) return;
        var encoderNum = ((paramIndex + 4) % 8) + 1;
        this.setEncoderLED(encoderNum, Math.round(value * 127));
    },

    /**
     * Link an encoder to custom behavior callbacks
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {Function} turnCallback - Called on encoder turn with value (0-127)
     * @param {Function} pressCallback - Called on encoder press with pressed state (boolean)
     * @param {Object} color - RGB color {r, g, b} (0-255 each)
     */
    linkEncoderToBehavior: function(encoderNumber, turnCallback, pressCallback, color) {
        // Validate encoder number
        if (encoderNumber < 1 || encoderNumber > 16) {
            if (debug) println("Warning: Invalid encoder number " + encoderNumber + " (must be 1-16)");
            return;
        }

        // Clear any existing track link for this encoder
        this.unlinkEncoder(encoderNumber);

        // Store the behavior
        this._encoderBehaviors[encoderNumber] = {
            turnCallback: turnCallback,
            pressCallback: pressCallback
        };

        // Set encoder color
        if (color) {
            this.setEncoderColor(encoderNumber, color.r, color.g, color.b);
        }

        if (debug) println("Linked encoder " + encoderNumber + " to custom behavior");
    },

    /**
     * Unlink an encoder from its track or behavior
     * @param {number} encoderNumber - Encoder number (1-16)
     */
    unlinkEncoder: function(encoderNumber) {
        // Clear track link if exists (check for effect track first)
        if (this._encoderLinks[encoderNumber]) {
            var link = this._encoderLinks[encoderNumber];

            if (link.isEffectTrack) {
                // Effect track link - clean up effect track mapping
                delete this._effectTrackToEncoder[link.effectIndex];
            } else if (link.trackId !== undefined) {
                // Regular track link
                delete this._trackToEncoder[link.trackId];
            }

            delete this._encoderLinks[encoderNumber];
        }

        // Clear send link if exists
        if (this._sendLinks[encoderNumber]) {
            var sendLink = this._sendLinks[encoderNumber];
            var key = sendLink.trackId + '_' + sendLink.sendIndex;
            delete this._sendToEncoder[key];
            delete this._sendLinks[encoderNumber];
        }

        // Clear behavior link if exists
        if (this._encoderBehaviors[encoderNumber]) {
            delete this._encoderBehaviors[encoderNumber];
        }

        // Clear encoder display
        this.clearEncoder(encoderNumber);
    },

    /**
     * Get the track linked to an encoder
     * @param {number} encoderNumber - Encoder number (1-16)
     * @returns {Object|null} Track object or null
     */
    getLinkedTrack: function(encoderNumber) {
        var link = this._encoderLinks[encoderNumber];
        return link ? link.track : null;
    },

    /**
     * Handle encoder rotation (called by Controller)
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {number} value - MIDI value (0-127)
     */
    handleEncoderTurn: function(encoderNumber, value) {
        // Check for remote control mode (encoders 1-8)
        if (this._remoteControlMode && encoderNumber <= 8) {
            var remoteControls = Bitwig.getRemoteControls();
            if (remoteControls) {
                // Reverse mapping: encoders 5-8 -> params 0-3, encoders 1-4 -> params 4-7
                var paramIndex = ((encoderNumber + 3) % 8);
                remoteControls.getParameter(paramIndex).value().set(value / 127.0);
            }
            return;
        }

        // Check for custom behavior first
        var behavior = this._encoderBehaviors[encoderNumber];
        if (behavior && behavior.turnCallback) {
            behavior.turnCallback(value);
            return;
        }

        // Check for send mode (encoders 1-8) - sendA is a pad mode
        var sendLink = this._sendLinks[encoderNumber];
        if (sendLink && LaunchpadModeSwitcher.getPadMode() === 'sendA') {
            sendLink.send.value().set(value / 127.0);
            return;
        }

        // Check for effect track link (encoders 9-16 in send mode)
        var link = this._encoderLinks[encoderNumber];
        if (link && link.isEffectTrack) {
            link.track.volume().set(value / 127.0);
            return;
        }

        // Fall through to regular track handling
        var track = this.getLinkedTrack(encoderNumber);
        if (track) {
            var normalizedValue = value / 127.0;

            // Check encoder mode (volume or pan)
            if (LaunchpadModeSwitcher.getEncoderMode() === 'pan') {
                track.pan().set(normalizedValue);
            } else {
                // Default: volume mode
                track.volume().set(normalizedValue);
            }
        }
    },

    /**
     * Handle encoder button press (called by Controller)
     * @param {number} encoderNumber - Encoder number (1-16)
     * @param {boolean} pressed - True if pressed, false if released
     */
    handleEncoderPress: function(encoderNumber, pressed) {
        // Check for custom behavior first
        var behavior = this._encoderBehaviors[encoderNumber];
        if (behavior && behavior.pressCallback) {
            behavior.pressCallback(pressed);
            return;
        }

        // Fall through to track handling
        var track = this.getLinkedTrack(encoderNumber);
        if (track) {
            if (pressed) {
                host.showPopupNotification("Encoder " + encoderNumber + ": " + track.name().get());
            }
            track.solo().set(pressed);
        }
    },

    /**
     * Find closest color index in palette
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {number} Color index (0-127)
     * @private
     */
    findClosestColorIndex: function(r, g, b) {
        var hue = this._rgbToHue(r, g, b);
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var saturation = (max === 0) ? 0 : (max - min) / max;

        // Log color info for debugging
        if (debug) {
            println("Color: RGB(" + r + ", " + g + ", " + b +
                    ") Hue: " + hue.toFixed(1) +
                    "° Sat: " + saturation.toFixed(2) +
                    " Bright: " + max);
        }

        // Special case: Grayscale colors (low saturation)
        if (saturation < 0.15) {
            if (debug) println("  -> Grayscale detected");
            return 0;
        }

        // Special case: Purple colors (hue 270-330°)
        if (hue >= 270 && hue <= 330) {
            if (debug) println("  -> Purple detected, hue: " + hue.toFixed(1));
            var purpleRange = hue - 270;  // 0-60
            var colorIndex = Math.round(105 + (purpleRange * 15 / 60));
            if (debug) println("  -> Purple mapped to index: " + colorIndex);
            return colorIndex;
        }

        // Map hue (0-360) to color index (0-127)
        // MF Twister uses inverted hue + 240° rotation
        var invertedHue = 360 - hue;
        var adjustedHue = (invertedHue + 240) % 360;
        var colorIndex = Math.round(adjustedHue * 127 / 360);

        if (debug) println("  -> Index: " + colorIndex);
        return colorIndex;
    },

    /**
     * Convert RGB to hue angle
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {number} Hue angle (0-360)
     * @private
     */
    _rgbToHue: function(r, g, b) {
        r = r / 255;
        g = g / 255;
        b = b / 255;

        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var delta = max - min;

        if (delta === 0) {
            return 0; // Gray/black/white - no hue
        }

        var hue;
        if (max === r) {
            hue = 60 * (((g - b) / delta) % 6);
        } else if (max === g) {
            hue = 60 * (((b - r) / delta) + 2);
        } else {
            hue = 60 * (((r - g) / delta) + 4);
        }

        if (hue < 0) {
            hue += 360;
        }

        return hue;
    }
};
