/**
 * nanoKEY2 hardware abstraction for key selection
 * @namespace
 */
var NanoKey2 = {
    /**
     * Key mapping: MIDI note -> key name, mode, and transpose semitones
     * First octave (C3-B3, MIDI 48-59): Major keys
     * Second octave (C4-B4, MIDI 60-71): Minor keys (using relative major transpose)
     */
    keyMap: {
        // Major keys (first octave: C3-B3, MIDI 48-59)
        48: { name: "C", semitones: -1, mode: "Major" },
        49: { name: "Db", semitones: 0, mode: "Major" },
        50: { name: "D", semitones: 1, mode: "Major" },
        51: { name: "Eb", semitones: 2, mode: "Major" },
        52: { name: "E", semitones: 3, mode: "Major" },
        53: { name: "F", semitones: 4, mode: "Major" },
        54: { name: "F#", semitones: 5, mode: "Major" },
        55: { name: "G", semitones: 6, mode: "Major" },
        56: { name: "G#", semitones: -6, mode: "Major" },
        57: { name: "A", semitones: -4, mode: "Major" },
        58: { name: "Bb", semitones: -3, mode: "Major" },
        59: { name: "B", semitones: -2, mode: "Major" },

        // Minor keys (second octave: C4-B4, MIDI 60-71)
        // Each minor key uses the transpose of its relative major (3 semitones higher)
        60: { name: "C", semitones: 2, mode: "Minor" },    // C minor = Eb major
        61: { name: "Db", semitones: 3, mode: "Minor" },   // Db minor = E major
        62: { name: "D", semitones: 4, mode: "Minor" },    // D minor = F major
        63: { name: "Eb", semitones: 5, mode: "Minor" },   // Eb minor = F# major
        64: { name: "E", semitones: 6, mode: "Minor" },    // E minor = G major
        65: { name: "F", semitones: -6, mode: "Minor" },   // F minor = G# major
        66: { name: "F#", semitones: -4, mode: "Minor" },  // F# minor = A major
        67: { name: "G", semitones: -3, mode: "Minor" },   // G minor = Bb major
        68: { name: "G#", semitones: -2, mode: "Minor" },  // G# minor = B major
        69: { name: "A", semitones: -1, mode: "Minor" },   // A minor = C major
        70: { name: "Bb", semitones: 0, mode: "Minor" },   // Bb minor = Db major
        71: { name: "B", semitones: 1, mode: "Minor" }     // B minor = D major
    },

    /**
     * Internal reference to note input
     * @private
     */
    _noteInput: null,

    /**
     * Currently selected key name
     * @private
     */
    _currentKey: "Db",

    /**
     * Initialize nanoKEY2 hardware
     */
    init: function() {
        // Create note input for nanoKEY2 on port 3
        // Port 3 should be configured to "nanoKEY2" in controller settings
        // This input allows MIDI callback to see events for key selection
        this._noteInput = host.getMidiInPort(3).createNoteInput("nanoKEY2 - Key Selector", "??????");
        this._noteInput.setShouldConsumeEvents(false);  // Allow MIDI callback to see events

        if (debug) println("Created 'nanoKEY2 - Key Selector' note input on port 3");
    },

    /**
     * Handle key selection from nanoKEY2
     * @param {number} midiNote - MIDI note number (48-59 for C-B)
     */
    handleKeySelection: function(midiNote) {
        var keyInfo = this.keyMap[midiNote];

        if (!keyInfo) {
            // Not a key selection note (outside supported ranges)
            return;
        }

        // Update current key
        this._currentKey = keyInfo.name;

        // Set transpose on Roland Piano
        RolandPiano.setTranspose(keyInfo.semitones);

        // Show notification with key and mode
        host.showPopupNotification("Key: " + keyInfo.name + " " + keyInfo.mode);

        if (debug) {
            println("Key selected: " + keyInfo.name + " " + keyInfo.mode +
                    " (" + keyInfo.semitones + " semitones)");
        }
    },

    /**
     * Get currently selected key name
     * @returns {string} Current key name
     */
    getCurrentKey: function() {
        return this._currentKey;
    }
};
