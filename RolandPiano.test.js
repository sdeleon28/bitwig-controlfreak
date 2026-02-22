var RolandPianoHW = require('./RolandPiano');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeNoteInput() {
    return {
        consumeEvents: false,
        translationTable: null,
        setShouldConsumeEvents: function(v) { this.consumeEvents = v; },
        setKeyTranslationTable: function(table) { this.translationTable = table; }
    };
}

function fakeHost() {
    var noteInput = fakeNoteInput();
    return {
        noteInput: noteInput,
        getMidiInPort: function(port) {
            return {
                createNoteInput: function(name, filter) {
                    noteInput._name = name;
                    noteInput._filter = filter;
                    return noteInput;
                }
            };
        }
    };
}

function makePiano(opts) {
    opts = opts || {};
    return new RolandPianoHW({
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// init creates note input on port 2
(function() {
    var h = fakeHost();
    var piano = makePiano({ host: h });
    piano.init();
    assert(h.noteInput._name === "Roland Piano (Transposed)", 'note input created with correct name');
    assert(h.noteInput.consumeEvents === true, 'note input consumes events');
})();

// setTranspose builds correct translation table for positive offset
(function() {
    var piano = makePiano();
    piano.init();
    piano.setTranspose(5);
    var table = piano._noteInput.translationTable;
    assert(table.length === 128, 'table has 128 entries');
    assert(table[0] === 5, 'note 0 transposed to 5');
    assert(table[60] === 65, 'middle C (60) transposed to 65');
    assert(table[127] === 127, 'note 127 clamped to 127');
    assert(table[124] === 127, 'note 124 + 5 clamped to 127');
})();

// setTranspose builds correct translation table for negative offset
(function() {
    var piano = makePiano();
    piano.init();
    piano.setTranspose(-12);
    var table = piano._noteInput.translationTable;
    assert(table[0] === 0, 'note 0 clamped to 0');
    assert(table[11] === 0, 'note 11 clamped to 0');
    assert(table[12] === 0, 'note 12 maps to 0');
    assert(table[72] === 60, 'note 72 maps to 60');
})();

// setTranspose with zero offset is identity
(function() {
    var piano = makePiano();
    piano.init();
    piano.setTranspose(0);
    var table = piano._noteInput.translationTable;
    for (var i = 0; i < 128; i++) {
        assert(table[i] === i, 'note ' + i + ' maps to itself with zero transpose');
    }
})();

// setTranspose without init logs error and does not throw
(function() {
    var errors = [];
    var piano = new RolandPianoHW({
        debug: false,
        println: function(msg) { errors.push(msg); }
    });
    piano.setTranspose(5);
    assert(errors.length === 1, 'error logged');
    assert(errors[0].indexOf('ERROR') !== -1, 'error message contains ERROR');
})();

// setTranspose stores offset
(function() {
    var piano = makePiano();
    piano.init();
    piano.setTranspose(7);
    assert(piano._transposeOffset === 7, 'transpose offset stored');
})();

// ---- summary ----

process.exit(t.summary('RolandPiano'));
