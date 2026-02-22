/**
 * TD-17 drum remapper for GGD plugins
 * Routes snare/rim pad output to correct GGD notes with velocity scaling
 */
class TD17RemapperHW {
    constructor(deps) {
        this.noteInput = deps.noteInput;
        this.println = deps.println;

        // Configuration with defaults matching TD-17 + GGD setup
        this.FIRST_GGD_RIMSHOT_VELOCITY = deps.firstGgdRimshotVelocity || 99;
        this.FIRST_RIMPAD_RIMSHOT_VELOCITY = deps.firstRimpadRimshotVelocity || 80;
        this.GGD_SNARE_NOTE = deps.ggdSnareNote || 38;
        this.GGD_CROSSTICK_NOTE = deps.ggdCrosstickNote || 37;
        this.TD17_SNARE_NOTE = deps.td17SnareNote || 38;
        this.TD17_RIMSHOT_NOTE = deps.td17RimshotNote || 40;
        this.RIM_SOFT_HARD_THRESHOLD = deps.rimSoftHardThreshold || 50;
    }

    /**
     * Scale velocity from one range to another
     * @param {number} velocity - Input velocity (1-127)
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} Scaled velocity, clamped to 1-127
     */
    scaleVelocity(velocity, inMin, inMax, outMin, outMax) {
        var scaled = outMin + Math.round((velocity - inMin) * (outMax - outMin) / (inMax - inMin));
        return Math.max(1, Math.min(127, scaled));
    }

    /**
     * Handle incoming MIDI messages
     * @param {number} status - MIDI status byte
     * @param {number} data1 - MIDI data byte 1 (note number)
     * @param {number} data2 - MIDI data byte 2 (velocity)
     */
    onMidi(status, data1, data2) {
        var isNoteOn = (status & 0xF0) === 0x90 && data2 > 0;
        var isNoteOff = (status & 0xF0) === 0x80 || ((status & 0xF0) === 0x90 && data2 === 0);

        // Snare pad: cap velocity
        if (isNoteOn && data1 === this.TD17_SNARE_NOTE) {
            var capped = Math.min(data2, this.FIRST_GGD_RIMSHOT_VELOCITY - 1);
            this.println("SNARE: vel " + data2 + " -> " + capped);
            this.noteInput.sendRawMidiEvent(status, this.GGD_SNARE_NOTE, capped);
            return;
        }

        // Rim pad: route to crosstick or rimshot
        if (isNoteOn && data1 === this.TD17_RIMSHOT_NOTE) {
            if (data2 < this.RIM_SOFT_HARD_THRESHOLD) {
                // Crosstick: scale 1-(threshold-1) → 1-127
                var crosstickVel = this.scaleVelocity(data2, 1, this.RIM_SOFT_HARD_THRESHOLD - 1, 1, 127);
                this.println("RIM SOFT: vel " + data2 + " -> crosstick (" + this.GGD_CROSSTICK_NOTE + ") vel " + crosstickVel);
                this.noteInput.sendRawMidiEvent(status, this.GGD_CROSSTICK_NOTE, crosstickVel);
            } else {
                // Rimshot: scale threshold-127 → FIRST_GGD_RIMSHOT_VELOCITY-127
                var rimshotVel = this.scaleVelocity(data2, this.RIM_SOFT_HARD_THRESHOLD, 127, this.FIRST_GGD_RIMSHOT_VELOCITY, 127);
                this.println("RIM HARD: vel " + data2 + " -> rimshot (" + this.GGD_SNARE_NOTE + ") vel " + rimshotVel);
                this.noteInput.sendRawMidiEvent(status, this.GGD_SNARE_NOTE, rimshotVel);
            }
            return;
        }

        // Note-off for rim: release both possible notes
        if (isNoteOff && data1 === this.TD17_RIMSHOT_NOTE) {
            this.noteInput.sendRawMidiEvent(status, this.GGD_CROSSTICK_NOTE, 0);
            this.noteInput.sendRawMidiEvent(status, this.GGD_SNARE_NOTE, 0);
            return;
        }

        // Block everything else
    }
}

if (typeof module !== 'undefined') module.exports = TD17RemapperHW;
