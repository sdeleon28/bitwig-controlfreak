loadAPI(17);

host.defineController("Generic", "Launchpad + Twister", "1.0", "3ffac818-54ac-45e0-928a-d01628afceac", "xan_t");
host.defineMidiPorts(2, 2);

// Debug flag - set to true to enable verbose logging
var debug = false;

// ============================================================================
// Namespace Structure
// ============================================================================

/**
 * @typedef {Object} BitwigTrack
 * @property {number} id - Track index in bank (0-63)
 * @property {string} name - Track name
 * @property {boolean} isGroup - Whether track is a group
 * @property {number} depth - Hierarchy depth (0=top, 1=child, 2=grandchild)
 * @property {BitwigTrack[]} children - Child tracks
 */

/**
 * @typedef {Object} BitwigColor
 * @property {number} red - Red component (0-1)
 * @property {number} green - Green component (0-1)
 * @property {number} blue - Blue component (0-1)
 */

/**
 * Bitwig API abstraction
 * @namespace
 */
var Bitwig = {
    /**
     * Internal reference to track bank
     * @private
     */
    _trackBank: null,

    /**
     * Cached track tree structure
     * @private
     */
    _trackTree: null,

    /**
     * Track depth information
     * @private
     */
    _trackDepths: [],

    /**
     * Initialize Bitwig API
     * @param {Object} trackBank - Bitwig track bank object
     */
    init: function(trackBank) {
        this._trackBank = trackBank;
        this._trackDepths = [];
        this._trackTree = null;
    },

    /**
     * Get track by ID
     * @param {number} id - Track ID (0-63)
     * @returns {Object|null} Track object or null if not found
     */
    getTrack: function(id) {
        if (!this._trackBank || id < 0 || id >= 64) {
            return null;
        }
        var track = this._trackBank.getItemAt(id);
        return track.exists().get() ? track : null;
    },

    /**
     * Get hierarchical track tree
     * @returns {BitwigTrack[]} Array of top-level tracks with nested children
     */
    getTrackTree: function() {
        if (this._trackTree) {
            return this._trackTree;
        }

        // Build tree from track bank
        var tree = [];
        var parentStack = [{ children: tree }];

        for (var i = 0; i < 64; i++) {
            var track = this.getTrack(i);
            if (!track) continue;

            var trackInfo = {
                id: i,
                name: track.name().get(),
                isGroup: track.isGroup().get(),
                depth: this._trackDepths[i] || 0,
                children: []
            };

            // Truncate parent stack to current depth
            parentStack.length = trackInfo.depth + 1;

            // Get parent at current depth
            var parent = parentStack[trackInfo.depth] || parentStack[0];
            parent.children.push(trackInfo);

            // Update stack for this depth level
            parentStack[trackInfo.depth + 1] = trackInfo;
        }

        this._trackTree = tree;
        return tree;
    },

    /**
     * Get child tracks of a group
     * @param {number} id - Group track ID
     * @returns {BitwigTrack[]} Array of child tracks
     */
    getTrackChildren: function(id) {
        var tree = this.getTrackTree();

        // Find track in tree
        function findTrack(tracks, targetId) {
            for (var i = 0; i < tracks.length; i++) {
                if (tracks[i].id === targetId) {
                    return tracks[i];
                }
                var found = findTrack(tracks[i].children, targetId);
                if (found) return found;
            }
            return null;
        }

        var track = findTrack(tree, id);
        return track ? track.children : [];
    },

    /**
     * Get track color
     * @param {number} id - Track ID
     * @returns {BitwigColor|null} Color object or null
     */
    getTrackColor: function(id) {
        var track = this.getTrack(id);
        if (!track) return null;

        var color = track.color();
        return {
            red: color.red(),
            green: color.green(),
            blue: color.blue()
        };
    },

    /**
     * Get track volume
     * @param {number} id - Track ID
     * @returns {number} Volume value (0-1) or -1 if not found
     */
    getTrackVolume: function(id) {
        var track = this.getTrack(id);
        if (!track) return -1;

        return track.volume().get();
    },

    /**
     * Set track volume
     * @param {number} id - Track ID
     * @param {number} value - Volume value (0-1)
     */
    setTrackVolume: function(id, value) {
        var track = this.getTrack(id);
        if (!track) return;

        track.volume().set(value);
    },

    /**
     * Find track by name predicate
     * @param {Function} predicate - Function that tests track name
     * @returns {Object|null} First matching track or null
     */
    findTrackByName: function(predicate) {
        for (var i = 0; i < 64; i++) {
            var track = this.getTrack(i);
            if (track && predicate(track.name().get())) {
                return track;
            }
        }
        return null;
    },

    /**
     * Update track depths (called after calculation)
     * @param {number[]} depths - Array of track depths
     */
    setTrackDepths: function(depths) {
        this._trackDepths = depths;
        this._trackTree = null; // Clear cache
    },

    /**
     * Clear cached data
     */
    clearCache: function() {
        this._trackTree = null;
    }
};

/**
 * @typedef {Object} LaunchpadColor
 * @property {number} value - MIDI color value for Launchpad
 */

/**
 * Launchpad hardware abstraction
 * @namespace
 */
var Launchpad = {
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

    /**
     * Internal reference to MIDI output
     * @private
     */
    _output: null,

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
    }
};

/**
 * @typedef {Object} TwisterColor
 * @property {number} idx - MIDI color index
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255)
 * @property {number} b - Blue component (0-255)
 */

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
        return encoderNumber - 1;
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
     * Clear all encoders
     */
    clearAll: function() {
        for (var i = 1; i <= 16; i++) {
            this.clearEncoder(i);
        }
        if (debug) println("All Twister encoders cleared");
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

/**
 * Controller business logic
 * @namespace
 */
var Controller = {
    // Pad configuration: Map note numbers to mode labels (bottom-left 4x4 quadrant)
    padConfig: {
        // Row 0 (bottom)
        11: "volume", 12: "mode2",  13: "mode3",  14: "mode4",
        // Row 1
        21: "mode5",  22: "mode6",  23: "mode7",  24: "mode8",
        // Row 2
        31: "mode9",  32: "mode10", 33: "mode11", 34: "mode12",
        // Row 3
        41: "mode13", 42: "mode14", 43: "mode15", 44: "mode16"
    },

    /**
     * Currently selected pad/mode
     * @private
     */
    selectedPad: null,

    /**
     * Initialize controller
     */
    init: function() {
        // Auto-select "volume" mode on startup
        this.selectPad(11);
        if (debug) println("Controller initialized - Volume mode selected");
    },

    /**
     * Select a mode pad
     * @param {number} note - MIDI note number for the pad
     */
    selectPad: function(note) {
        // Check if this pad is in our config
        if (!this.padConfig[note]) {
            return;
        }

        // Clear encoder LEDs when switching modes
        Twister.clearAll();

        // Turn off previously selected pad
        if (this.selectedPad !== null) {
            Launchpad.clearPad(this.selectedPad);
        }

        // Light up new pad
        Launchpad.setPadColor(note, 'green');

        // Update state
        this.selectedPad = note;

        // Sync encoder LEDs to track volumes for new mode
        this.syncAllEncoders();
    },

    /**
     * Find track by CC marker in name
     * @param {number} ccNumber - CC number (0-15)
     * @returns {Object|null} Track object or null
     */
    findTrackByCC: function(ccNumber) {
        // Search for track with "(CC#)" in the name
        var searchString = "(" + ccNumber + ")";
        return Bitwig.findTrackByName(function(name) {
            return name.indexOf(searchString) !== -1;
        });
    },

    /**
     * Find track by encoder number marker in name
     * @param {number} encoderNumber - Encoder number (1-16)
     * @returns {Object|null} Track object or null
     */
    findTrackByEncoder: function(encoderNumber) {
        // Convert 1-based encoder to 0-based CC
        return this.findTrackByCC(encoderNumber - 1);
    },

    /**
     * Sync encoder to its mapped track
     * @param {number} encoderNumber - Encoder number (1-16)
     */
    syncEncoderToTrack: function(encoderNumber) {
        var track = this.findTrackByEncoder(encoderNumber);

        if (track) {
            // Sync volume value
            var volumeValue = track.volume().get();
            var midiValue = Math.round(volumeValue * 127);
            Twister.setEncoderLED(encoderNumber, midiValue);

            // Sync track color
            var color = track.color();
            var red = Math.round(color.red() * 255);
            var green = Math.round(color.green() * 255);
            var blue = Math.round(color.blue() * 255);
            Twister.setEncoderColor(encoderNumber, red, green, blue);
        } else {
            // No track mapped - turn off encoder
            Twister.clearEncoder(encoderNumber);
        }
    },

    /**
     * Sync all encoders to their mapped tracks
     */
    syncAllEncoders: function() {
        if (debug) println("Syncing all encoder LEDs...");
        for (var i = 1; i <= 16; i++) {
            this.syncEncoderToTrack(i);
        }
    },

    /**
     * Handle Launchpad MIDI input
     * @param {number} status - MIDI status byte
     * @param {number} data1 - MIDI data1 byte
     * @param {number} data2 - MIDI data2 byte
     */
    onLaunchpadMidi: function(status, data1, data2) {
        // Handle pad press (note on with velocity > 0)
        if (status === 0x90 && data2 > 0) {
            this.selectPad(data1);
        }
    },

    /**
     * Handle Twister MIDI input
     * @param {number} status - MIDI status byte
     * @param {number} data1 - MIDI data1 byte (CC number)
     * @param {number} data2 - MIDI data2 byte (value)
     */
    onTwisterMidi: function(status, data1, data2) {
        // Only respond when volume mode is selected
        if (this.selectedPad !== 11) {
            return;
        }

        // Handle encoder turn (CC on channel 0, status 0xB0)
        if (status === 0xB0) {
            if (debug) println("Twister Encoder: " + data1 + " value: " + data2);

            // Find track with "(CC#)" in the name
            var track = this.findTrackByCC(data1);

            if (track) {
                var normalizedValue = data2 / 127.0;
                track.volume().set(normalizedValue);
                if (debug) println("Volume set to: " + normalizedValue.toFixed(2));
            } else {
                if (debug) println("No track found with (" + data1 + ") in name");
            }
        }

        // Handle button press (CC on channel 1, status 0xB1)
        if (status === 0xB1) {
            if (debug) println("Twister Button: " + data1 + " value: " + data2);
            var track = this.findTrackByCC(data1);
            if (track) {
                if (data2 > 0) {
                    track.solo().set(true);
                } else {
                    track.solo().set(false);
                }
            }
        }
    },

    /**
     * Clean up on exit
     */
    exit: function() {
        // Clear hardware
        Twister.clearAll();
        Launchpad.clearAll();
        Launchpad.exitProgrammerMode();
    }
};

// ============================================================================
// Global Variables (to be refactored)
// ============================================================================

var launchpadOut;
var twisterOut;

// Bitwig API objects
var trackBank;
var trackDepths = []; // Store track depths detected during init

function calculateTrackDepths() {
    // Calculate depths based on naming convention:
    // - "top xxx" groups are depth 0
    // - Tracks after "top" group are depth 1
    // - Tracks after a depth-1 group are depth 2

    var depths = [];
    var currentTopGroup = -1;  // Index of current top-level group
    var currentChildGroup = -1;  // Index of current child group

    for (var i = 0; i < 64; i++) {
        var track = Bitwig.getTrack(i);
        if (!track) {
            depths[i] = 0;
            continue;
        }

        var trackName = track.name().get();
        var isGroup = track.isGroup().get();

        // Check if this is a top-level group
        if (trackName && trackName.toLowerCase().indexOf("top ") === 0) {
            depths[i] = 0;
            currentTopGroup = i;
            currentChildGroup = -1;  // Reset child group
            if (debug) println("[" + i + "] '" + trackName + "' -> depth 0 (top group)");
        }
        // Check if this is a child group (depth 1 group)
        else if (isGroup && currentTopGroup >= 0) {
            depths[i] = 1;
            currentChildGroup = i;
            if (debug) println("[" + i + "] '" + trackName + "' -> depth 1 (child group)");
        }
        // Regular track - determine depth based on parent groups
        else {
            if (currentChildGroup >= 0) {
                // We're inside a child group
                depths[i] = 2;
                if (debug) println("[" + i + "] '" + trackName + "' -> depth 2 (inside child group)");
            } else if (currentTopGroup >= 0) {
                // We're inside a top group but not a child group
                depths[i] = 1;
                if (debug) println("[" + i + "] '" + trackName + "' -> depth 1 (inside top group)");
            } else {
                // No parent group
                depths[i] = 0;
                if (debug) println("[" + i + "] '" + trackName + "' -> depth 0 (no parent)");
            }
        }
    }

    // Store depths in Bitwig namespace
    Bitwig.setTrackDepths(depths);
}


function printTrack(track, indent) {
    // Print track with indentation
    var indentStr = "";
    for (var i = 0; i < indent; i++) {
        indentStr += "  ";
    }

    var line = indentStr + "[" + track.id + "] " + track.name;
    if (track.isGroup) {
        line += " (GROUP)";
    }
    line += " - depth = " + track.depth;

    if (debug) println(line);

    // Recursively print children
    for (var j = 0; j < track.children.length; j++) {
        printTrack(track.children[j], indent + 1);
    }
}

function printTrackTree(tree) {
    if (debug) {
        println("=== TRACK TREE ===");

        for (var i = 0; i < tree.length; i++) {
            printTrack(tree[i], 0);
        }

        println("=== END TREE ===");
    }
}

function init() {
    transport = host.createTransport();

    // Launchpad on port 0
    launchpadOut = host.getMidiOutPort(0);
    Launchpad.init(launchpadOut);

    noteIn = host.getMidiInPort(0).createNoteInput("Launchpad", "??????");
    noteIn.setShouldConsumeEvents(false);

    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        printMidi(status, data1, data2);
        Controller.onLaunchpadMidi(status, data1, data2);
    });
    host.getMidiInPort(0).setSysexCallback(onSysex);

    // MIDI Fighter Twister on port 1
    twisterOut = host.getMidiOutPort(1);
    Twister.init(twisterOut);

    host.getMidiInPort(1).setMidiCallback(function(status, data1, data2) {
        Controller.onTwisterMidi(status, data1, data2);
    });

    // Create main track bank to access all tracks (flat list including nested tracks)
    trackBank = host.createMainTrackBank(64, 0, 0);

    // Initialize Bitwig namespace with track bank
    Bitwig.init(trackBank);

    // Subscribe to all track properties
    for (var i = 0; i < 64; i++) {
        var track = trackBank.getItemAt(i);
        track.exists().markInterested();
        track.name().markInterested();
        track.isGroup().markInterested();
        track.solo().markInterested();
        track.color().markInterested();

        // Add volume observer to update encoder LEDs in real-time
        (function(trackIndex) {
            trackBank.getItemAt(trackIndex).volume().addValueObserver(128, function(value) {
                // When volume changes, find which encoder(s) map to this track and update them
                var trackName = trackBank.getItemAt(trackIndex).name().get();

                // Check each encoder 1-16 to see if this track is mapped to it
                for (var encoder = 1; encoder <= 16; encoder++) {
                    var searchString = "(" + (encoder - 1) + ")";
                    if (trackName.indexOf(searchString) !== -1) {
                        Twister.setEncoderLED(encoder, value);
                    }
                }
            });

            // Add color observer to update encoder colors in real-time
            trackBank.getItemAt(trackIndex).color().addValueObserver(function(red, green, blue) {
                // When color changes, find which encoder(s) map to this track and update them
                var trackName = trackBank.getItemAt(trackIndex).name().get();
                var redMidi = Math.round(red * 255);
                var greenMidi = Math.round(green * 255);
                var blueMidi = Math.round(blue * 255);

                // Check each encoder 1-16 to see if this track is mapped to it
                for (var encoder = 1; encoder <= 16; encoder++) {
                    var searchString = "(" + (encoder - 1) + ")";
                    if (trackName.indexOf(searchString) !== -1) {
                        Twister.setEncoderColor(encoder, redMidi, greenMidi, blueMidi);
                    }
                }
            });
        })(i);
    }

    // Enter Programmer Mode on Launchpad MK2
    Launchpad.enterProgrammerMode();

    // Initialize controller logic
    Controller.init();

    // Build and print track tree for debugging (delayed to allow track bank to populate)
    host.scheduleTask(function() {
        if (debug) println("=== Calculating track depths ===");
        calculateTrackDepths();
        if (debug) println("=== Building track tree ===");
        var tree = Bitwig.getTrackTree();
        printTrackTree(tree);
    }, null, 100);  // Wait 100ms for track bank to populate
}


function onSysex(data) {
    printSysex(data);
}

function flush() {
}

function exit() {
    Controller.exit();
}
