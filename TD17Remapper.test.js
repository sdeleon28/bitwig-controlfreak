var TD17RemapperHW = require('./TD17Remapper');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeNoteInput() {
    var sent = [];
    return {
        sent: sent,
        sendRawMidiEvent: function(status, note, velocity) {
            sent.push({ status: status, note: note, velocity: velocity });
        }
    };
}

function makeRemapper(opts) {
    opts = opts || {};
    var ni = opts.noteInput || fakeNoteInput();
    var remapper = new TD17RemapperHW({
        noteInput: ni,
        println: opts.println || function() {},
        firstGgdRimshotVelocity: opts.firstGgdRimshotVelocity,
        firstRimpadRimshotVelocity: opts.firstRimpadRimshotVelocity,
        ggdSnareNote: opts.ggdSnareNote,
        ggdCrosstickNote: opts.ggdCrosstickNote,
        td17SnareNote: opts.td17SnareNote,
        td17RimshotNote: opts.td17RimshotNote,
        rimSoftHardThreshold: opts.rimSoftHardThreshold
    });
    return { remapper: remapper, noteInput: ni };
}

var NOTE_ON = 0x90;
var NOTE_OFF = 0x80;

// ---- tests ----

// Velocity scaling: maps range correctly
(function() {
    var r = makeRemapper();
    // Scale 50 from [0, 100] to [0, 200]
    assert(r.remapper.scaleVelocity(50, 0, 100, 0, 127) === 64, 'mid-range scales to ~64');
    // Scale min
    assert(r.remapper.scaleVelocity(1, 1, 127, 1, 127) === 1, 'identity scale at min');
    // Scale max
    assert(r.remapper.scaleVelocity(127, 1, 127, 1, 127) === 127, 'identity scale at max');
})();

// Velocity scaling: clamps to 1-127
(function() {
    var r = makeRemapper();
    // Would scale below 1
    assert(r.remapper.scaleVelocity(0, 0, 100, 1, 50) >= 1, 'clamped to minimum 1');
    // Would scale above 127
    assert(r.remapper.scaleVelocity(200, 0, 100, 1, 127) <= 127, 'clamped to maximum 127');
})();

// Snare pad: velocity capped below rimshot threshold
(function() {
    var r = makeRemapper();
    // Default snare note = 38, threshold = 99
    // Velocity 120 should be capped to 98
    r.remapper.onMidi(NOTE_ON, 38, 120);

    assert(r.noteInput.sent.length === 1, 'one MIDI event sent');
    assert(r.noteInput.sent[0].note === 38, 'routed to GGD snare note');
    assert(r.noteInput.sent[0].velocity === 98, 'velocity capped to 98 (threshold - 1)');
})();

// Snare pad: low velocity passes through uncapped
(function() {
    var r = makeRemapper();
    r.remapper.onMidi(NOTE_ON, 38, 50);

    assert(r.noteInput.sent.length === 1, 'one MIDI event sent');
    assert(r.noteInput.sent[0].velocity === 50, 'low velocity passes through');
})();

// Rim soft hits: routed to crosstick with velocity scaling
(function() {
    var r = makeRemapper();
    // Default rim note = 40, threshold = 50
    // Velocity 25 (below threshold) -> crosstick
    r.remapper.onMidi(NOTE_ON, 40, 25);

    assert(r.noteInput.sent.length === 1, 'one MIDI event sent');
    assert(r.noteInput.sent[0].note === 37, 'routed to GGD crosstick note');
    assert(r.noteInput.sent[0].velocity >= 1, 'velocity at least 1');
    assert(r.noteInput.sent[0].velocity <= 127, 'velocity at most 127');
})();

// Rim hard hits: routed to snare (rimshot) with velocity scaling
(function() {
    var r = makeRemapper();
    // Default rim note = 40, threshold = 50
    // Velocity 100 (above threshold) -> rimshot on snare note
    r.remapper.onMidi(NOTE_ON, 40, 100);

    assert(r.noteInput.sent.length === 1, 'one MIDI event sent');
    assert(r.noteInput.sent[0].note === 38, 'routed to GGD snare note (rimshot)');
    assert(r.noteInput.sent[0].velocity >= 99, 'velocity at least FIRST_GGD_RIMSHOT_VELOCITY');
    assert(r.noteInput.sent[0].velocity <= 127, 'velocity at most 127');
})();

// Rim max velocity maps to 127
(function() {
    var r = makeRemapper();
    r.remapper.onMidi(NOTE_ON, 40, 127);

    assert(r.noteInput.sent[0].velocity === 127, 'max rim velocity maps to 127');
})();

// Rim at threshold maps to FIRST_GGD_RIMSHOT_VELOCITY
(function() {
    var r = makeRemapper();
    r.remapper.onMidi(NOTE_ON, 40, 50);

    assert(r.noteInput.sent[0].note === 38, 'at threshold, routed to snare (rimshot)');
    assert(r.noteInput.sent[0].velocity === 99, 'at threshold, velocity = FIRST_GGD_RIMSHOT_VELOCITY');
})();

// Rim note-off: releases both crosstick and snare
(function() {
    var r = makeRemapper();
    r.remapper.onMidi(NOTE_OFF, 40, 0);

    assert(r.noteInput.sent.length === 2, 'two note-off events sent');
    assert(r.noteInput.sent[0].note === 37, 'first release is crosstick');
    assert(r.noteInput.sent[0].velocity === 0, 'crosstick velocity 0');
    assert(r.noteInput.sent[1].note === 38, 'second release is snare');
    assert(r.noteInput.sent[1].velocity === 0, 'snare velocity 0');
})();

// Rim note-off via velocity 0 note-on: releases both
(function() {
    var r = makeRemapper();
    r.remapper.onMidi(NOTE_ON, 40, 0);

    assert(r.noteInput.sent.length === 2, 'two note-off events for vel-0 note-on');
})();

// Non-matching notes: blocked (no output)
(function() {
    var r = makeRemapper();

    // Random note that's not snare or rim
    r.remapper.onMidi(NOTE_ON, 60, 100);
    assert(r.noteInput.sent.length === 0, 'non-matching note blocked');

    r.remapper.onMidi(NOTE_ON, 36, 80);
    assert(r.noteInput.sent.length === 0, 'kick note blocked');

    r.remapper.onMidi(NOTE_OFF, 60, 0);
    assert(r.noteInput.sent.length === 0, 'non-matching note-off blocked');
})();

// Snare note-off passes through (not blocked or doubled)
(function() {
    var r = makeRemapper();
    // Note-off for snare note (38) is not rim (40), so it's blocked
    r.remapper.onMidi(NOTE_OFF, 38, 0);
    assert(r.noteInput.sent.length === 0, 'snare note-off blocked (only rim note-off is handled)');
})();

// Custom configuration overrides defaults
(function() {
    var r = makeRemapper({
        td17SnareNote: 36,
        td17RimshotNote: 42,
        ggdSnareNote: 50,
        ggdCrosstickNote: 51,
        firstGgdRimshotVelocity: 80,
        rimSoftHardThreshold: 30
    });

    // Custom snare pad
    r.remapper.onMidi(NOTE_ON, 36, 100);
    assert(r.noteInput.sent[0].note === 50, 'custom snare note used');
    assert(r.noteInput.sent[0].velocity === 79, 'custom rimshot threshold applied');

    // Custom rim soft hit
    r.noteInput.sent.length = 0;
    r.remapper.onMidi(NOTE_ON, 42, 15);
    assert(r.noteInput.sent[0].note === 51, 'custom crosstick note used');

    // Custom rim hard hit
    r.noteInput.sent.length = 0;
    r.remapper.onMidi(NOTE_ON, 42, 50);
    assert(r.noteInput.sent[0].note === 50, 'custom snare note for rimshot');
})();

process.exit(t.summary('TD17Remapper'));
