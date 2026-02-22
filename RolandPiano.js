/**
 * Roland Digital Piano MIDI transpose control
 */
class RolandPianoHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.host - Bitwig host
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this._noteInput = null;
        this._transposeOffset = 0;
    }

    /**
     * Initialize Roland Piano transpose
     */
    init() {
        this._noteInput = this.host.getMidiInPort(2).createNoteInput("Roland Piano (Transposed)", "??????");
        this._noteInput.setShouldConsumeEvents(true);
        this._transposeOffset = 0;
        if (this.debug) this.println("Created 'Roland Piano (Transposed)' note input on port 2");
    }

    /**
     * Set transpose offset
     * @param {number} semitones - Transpose offset in semitones (can be negative)
     */
    setTranspose(semitones) {
        if (!this._noteInput) {
            this.println("ERROR: Piano note input not initialized");
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

        this.println("Roland Piano transpose: " + semitones + " semitones");
    }
}

var RolandPiano = {};
if (typeof module !== 'undefined') module.exports = RolandPianoHW;
