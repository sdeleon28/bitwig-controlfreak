var DrumPadMapper = require('./DrumPadMapper');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeNoteInput() {
    var events = [];
    return {
        events: events,
        sendRawMidiEvent: function(status, data1, data2) {
            events.push({ status: status, data1: data1, data2: data2 });
        }
    };
}

function fakeApi() {
    var paints = [];
    var notePads = {};
    return {
        paints: paints,
        notePads: notePads,
        paintPad: function(padIndex, color) {
            paints.push({ padIndex: padIndex, color: color });
        },
        registerNotePad: function(padIndex, onPress, onRelease) {
            notePads[padIndex] = { onPress: onPress, onRelease: onRelease };
        }
    };
}

// ---- tests ----

// usesFullQuadrant flag is true
(function() {
    var mapper = new DrumPadMapper({ noteInput: fakeNoteInput() });
    assert(mapper.usesFullQuadrant === true, 'usesFullQuadrant should be true');
})();

// activate registers 16 note pads
(function() {
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: fakeNoteInput() });
    mapper.activate(api);
    var count = Object.keys(api.notePads).length;
    assert(count === 16, 'should register 16 note pads, got ' + count);
})();

// activate paints all 16 pads amber (17)
(function() {
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: fakeNoteInput() });
    mapper.activate(api);
    assert(api.paints.length === 16, 'should paint 16 pads');
    for (var i = 0; i < 16; i++) {
        assert(api.paints[i].color === 17, 'pad ' + (i + 1) + ' should be amber (17)');
    }
})();

// pressing pad 1 sends note-on for C1 (MIDI 36)
(function() {
    var ni = fakeNoteInput();
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: ni });
    mapper.activate(api);
    api.notePads[1].onPress();
    assert(ni.events.length === 1, 'should send one MIDI event');
    assert(ni.events[0].status === 0x90, 'should be note-on');
    assert(ni.events[0].data1 === 36, 'should send MIDI note 36 (C1)');
    assert(ni.events[0].data2 === 100, 'should send velocity 100');
})();

// releasing pad 1 sends note-off for C1 (MIDI 36)
(function() {
    var ni = fakeNoteInput();
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: ni });
    mapper.activate(api);
    api.notePads[1].onPress();
    ni.events.length = 0;
    api.notePads[1].onRelease();
    assert(ni.events.length === 1, 'should send one MIDI event');
    assert(ni.events[0].status === 0x80, 'should be note-off');
    assert(ni.events[0].data1 === 36, 'should send MIDI note 36');
    assert(ni.events[0].data2 === 0, 'note-off velocity should be 0');
})();

// pad 16 maps to MIDI note 51 (D#2)
(function() {
    var ni = fakeNoteInput();
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: ni });
    mapper.activate(api);
    api.notePads[16].onPress();
    assert(ni.events[0].data1 === 51, 'pad 16 should send MIDI note 51 (D#2)');
})();

// pad-to-note mapping: padIndex N maps to baseNote + (N-1)
(function() {
    var ni = fakeNoteInput();
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: ni, baseNote: 36 });
    mapper.activate(api);
    for (var i = 1; i <= 16; i++) {
        ni.events.length = 0;
        api.notePads[i].onPress();
        assert(ni.events[0].data1 === 36 + (i - 1), 'pad ' + i + ' should map to note ' + (36 + (i - 1)));
    }
})();

// custom baseNote shifts all mappings
(function() {
    var ni = fakeNoteInput();
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: ni, baseNote: 60 });
    mapper.activate(api);
    api.notePads[1].onPress();
    assert(ni.events[0].data1 === 60, 'pad 1 with baseNote 60 should send note 60');
    ni.events.length = 0;
    api.notePads[16].onPress();
    assert(ni.events[0].data1 === 75, 'pad 16 with baseNote 60 should send note 75');
})();

// custom velocity
(function() {
    var ni = fakeNoteInput();
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: ni, velocity: 80 });
    mapper.activate(api);
    api.notePads[1].onPress();
    assert(ni.events[0].data2 === 80, 'should use custom velocity 80');
})();

// deactivate sends note-off for held pads (prevents stuck notes)
(function() {
    var ni = fakeNoteInput();
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: ni });
    mapper.activate(api);
    // Press pads 1 and 5 (hold them down)
    api.notePads[1].onPress();
    api.notePads[5].onPress();
    ni.events.length = 0;
    mapper.deactivate();
    // Should have sent note-off for both held notes
    assert(ni.events.length === 2, 'should send 2 note-off events for held pads');
    var noteOffs = ni.events.filter(function(e) { return e.status === 0x80; });
    assert(noteOffs.length === 2, 'both should be note-off');
    var notes = noteOffs.map(function(e) { return e.data1; }).sort();
    assert(notes[0] === 36, 'should send note-off for note 36');
    assert(notes[1] === 40, 'should send note-off for note 40');
})();

// deactivate with no held pads sends nothing
(function() {
    var ni = fakeNoteInput();
    var api = fakeApi();
    var mapper = new DrumPadMapper({ noteInput: ni });
    mapper.activate(api);
    // Press and release pad 1
    api.notePads[1].onPress();
    api.notePads[1].onRelease();
    ni.events.length = 0;
    mapper.deactivate();
    assert(ni.events.length === 0, 'should not send note-off when no pads held');
})();

// onParamValueChanged and onDirectParamNameChanged are no-ops
(function() {
    var mapper = new DrumPadMapper({ noteInput: fakeNoteInput() });
    mapper.onParamValueChanged('id', 0.5);
    mapper.onDirectParamNameChanged('id', 'name');
    assert(true, 'no-op methods should not throw');
})();

process.exit(t.summary('DrumPadMapper'));
