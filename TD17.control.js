loadAPI(24);

host.defineController("Generic", "TD-17 GGD Remapper", "1.0", "f8a3b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c", "xan_t");
host.defineMidiPorts(1, 1);

// ============== CONFIGURATION ==============
// Adjust these values to match your GGD plugin and playing style

var FIRST_GGD_RIMSHOT_VELOCITY = 99;      // GGD rimshot sounds start at this velocity
var FIRST_RIMPAD_RIMSHOT_VELOCITY = 80;   // Rim pad velocity threshold for rimshot vs crosstick

var GGD_SNARE_NOTE = 38;                  // D1 - GGD snare/rimshot note
var GGD_CROSSTICK_NOTE = 37;              // C#1 - GGD crosstick note

var TD17_SNARE_NOTE = 38;                 // TD-17 snare pad output
var TD17_RIMSHOT_NOTE = 40;               // TD-17 rim output

var RIM_SOFT_HARD_THRESHOLD = 50;         // Rim pad velocity threshold for soft hit vs hard hit
// ===========================================

var noteInput;

function init() {
    // Callback FIRST, before noteInput
    host.getMidiInPort(0).setMidiCallback(onMidi);

    // Empty filter - accepts nothing by default
    noteInput = host.getMidiInPort(0).createNoteInput("TD-17", "");

    println("TD-17 GGD Remapper initialized");
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
function scaleVelocity(velocity, inMin, inMax, outMin, outMax) {
    var scaled = outMin + Math.round((velocity - inMin) * (outMax - outMin) / (inMax - inMin));
    return Math.max(1, Math.min(127, scaled));
}

/**
 * Handle incoming MIDI messages
 */
function onMidi(status, data1, data2) {
    var isNoteOn = (status & 0xF0) === 0x90 && data2 > 0;
    var isNoteOff = (status & 0xF0) === 0x80 || ((status & 0xF0) === 0x90 && data2 === 0);

    // Snare pad: cap velocity
    if (isNoteOn && data1 === TD17_SNARE_NOTE) {
        var capped = Math.min(data2, FIRST_GGD_RIMSHOT_VELOCITY - 1);
        println("SNARE: vel " + data2 + " -> " + capped);
        noteInput.sendRawMidiEvent(status, GGD_SNARE_NOTE, capped);
        return;
    }

    // Rim pad: route to crosstick or rimshot
    if (isNoteOn && data1 === TD17_RIMSHOT_NOTE) {
        if (data2 < RIM_SOFT_HARD_THRESHOLD) {
            // Crosstick: scale 1-(threshold-1) → 1-127
            var crosstickVel = scaleVelocity(data2, 1, RIM_SOFT_HARD_THRESHOLD - 1, 1, 127);
            println("RIM SOFT: vel " + data2 + " -> crosstick (" + GGD_CROSSTICK_NOTE + ") vel " + crosstickVel);
            noteInput.sendRawMidiEvent(status, GGD_CROSSTICK_NOTE, crosstickVel);
        } else {
            // Rimshot: scale threshold-127 → FIRST_GGD_RIMSHOT_VELOCITY-127
            var rimshotVel = scaleVelocity(data2, RIM_SOFT_HARD_THRESHOLD, 127, FIRST_GGD_RIMSHOT_VELOCITY, 127);
            println("RIM HARD: vel " + data2 + " -> rimshot (" + GGD_SNARE_NOTE + ") vel " + rimshotVel);
            noteInput.sendRawMidiEvent(status, GGD_SNARE_NOTE, rimshotVel);
        }
        return;
    }

    // Note-off for rim: release both possible notes
    if (isNoteOff && data1 === TD17_RIMSHOT_NOTE) {
        noteInput.sendRawMidiEvent(status, GGD_CROSSTICK_NOTE, 0);
        noteInput.sendRawMidiEvent(status, GGD_SNARE_NOTE, 0);
        return;
    }

    // Block everything else
}

function flush() {}

function exit() {
    println("TD-17 GGD Remapper exited");
}
