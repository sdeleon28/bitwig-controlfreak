/**
 * Roland Digital Piano MIDI transpose control
 * @namespace
 */
var RolandPiano = {
    /**
     * Internal reference to note input
     * @private
     */
    _noteInput: null,

    /**
     * Current transpose offset in semitones
     * @private
     */
    _transposeOffset: 0,

    /**
     * Initialize Roland Piano transpose
     */
    init: function() {
        // Create transposing note input for Roland Digital Piano
        // Port 2 should be configured to "Roland Digital Piano" in controller settings
        // This creates a separate input that users can select for transpose functionality
        this._noteInput = host.getMidiInPort(2).createNoteInput("Roland Piano (Transposed)", "??????");
        this._noteInput.setShouldConsumeEvents(true);  // Take full control of this MIDI port
        this._transposeOffset = 0;
        if (debug) println("Created 'Roland Piano (Transposed)' note input on port 2");
    },

    /**
     * Set transpose offset
     * @param {number} semitones - Transpose offset in semitones (can be negative)
     */
    setTranspose: function(semitones) {
        if (!this._noteInput) {
            println("ERROR: Piano note input not initialized");
            return;
        }

        this._transposeOffset = semitones;

        // Build key translation table (128 MIDI notes)
        var table = [];
        for (var i = 0; i < 128; i++) {
            var transposed = i + semitones;
            // Clamp to valid MIDI range (0-127)
            if (transposed < 0) transposed = 0;
            if (transposed > 127) transposed = 127;
            table[i] = transposed;
        }

        // Apply translation to note input
        this._noteInput.setKeyTranslationTable(table);

        println("Roland Piano transpose: " + semitones + " semitones");
    }
};
