/**
 * DrumPadMapper — Makes 16 Launchpad pads play drum notes (C1–D#2, MIDI 36–51)
 * via noteInput.sendRawMidiEvent(). Uses the full 4×4 quadrant (no exit/bypass/solo).
 */
class DrumPadMapper {
    /**
     * @param {Object} deps
     * @param {Object} deps.noteInput - Bitwig NoteInput for sending MIDI events
     * @param {number} [deps.baseNote=36] - MIDI note for pad 1 (default C1)
     * @param {number} [deps.velocity=100] - Fixed velocity (LP MK2 is not velocity-sensitive)
     */
    constructor(deps) {
        deps = deps || {};
        this._noteInput = deps.noteInput;
        this._baseNote = deps.baseNote || 36;
        this._velocity = deps.velocity || 100;
        this._api = null;
        this._activeNotes = {};
        this.usesFullQuadrant = true;
    }

    /**
     * Activate drum pads: register 16 note pads, paint all amber.
     * @param {Object} api - QuadrantAPI with paintPad, registerNotePad
     */
    activate(api) {
        this._api = api;
        this._activeNotes = {};

        var self = this;
        for (var i = 1; i <= 16; i++) {
            var midiNote = this._baseNote + (i - 1);

            (function(padIndex, note) {
                api.registerNotePad(padIndex,
                    function() {
                        self._noteInput.sendRawMidiEvent(0x90, note, self._velocity);
                        self._activeNotes[padIndex] = note;
                    },
                    function() {
                        self._noteInput.sendRawMidiEvent(0x80, note, 0);
                        delete self._activeNotes[padIndex];
                    }
                );
            })(i, midiNote);

            api.paintPad(i, 17); // amber
        }
    }

    /**
     * Deactivate: send note-off for any held pads (prevent stuck notes), clear state.
     */
    deactivate() {
        for (var padIndex in this._activeNotes) {
            if (this._activeNotes.hasOwnProperty(padIndex)) {
                var note = this._activeNotes[padIndex];
                this._noteInput.sendRawMidiEvent(0x80, note, 0);
            }
        }
        this._activeNotes = {};
        this._api = null;
    }

    onParamValueChanged() {}
    onDirectParamNameChanged() {}
}

if (typeof module !== 'undefined') module.exports = DrumPadMapper;
