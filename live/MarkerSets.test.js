var MarkerSets = require('./MarkerSets');
var t = require('../test-assert');
var assert = t.assert;

function m(name, position) {
    return { name: name, position: position, color: { red: 0, green: 0, blue: 0 } };
}

// empty input -> no songs
(function() {
    var sets = MarkerSets.groupMarkers([]);
    assert(sets.length === 0, 'empty input yields no sets');
})();

// single song with no inner sections
(function() {
    var sets = MarkerSets.groupMarkers([
        m('{ song1', 0),
        m('}', 16)
    ]);
    assert(sets.length === 1, 'one song');
    assert(sets[0].name === 'song1', 'song name extracted');
    assert(sets[0].startBeat === 0, 'startBeat = first marker');
    assert(sets[0].endBeat === 16, 'endBeat = closing marker');
    assert(sets[0].markers.length === 2, 'opener and closer');
})();

// song with inner sections
(function() {
    var sets = MarkerSets.groupMarkers([
        m('{ amy', 0),
        m('intro', 8),
        m('verse', 16),
        m('}', 32)
    ]);
    assert(sets.length === 1, 'one song');
    assert(sets[0].name === 'amy', 'name extracted');
    assert(sets[0].markers.length === 4, 'opener + 2 sections + closer');
    assert(sets[0].startBeat === 0, 'starts at 0');
    assert(sets[0].endBeat === 32, 'ends at 32');
})();

// multiple songs
(function() {
    var sets = MarkerSets.groupMarkers([
        m('{ amy', 0),
        m('intro', 8),
        m('}', 32),
        m('{ pentium', 64),
        m('verse', 72),
        m('}', 96)
    ]);
    assert(sets.length === 2, 'two songs');
    assert(sets[0].name === 'amy', 'first song name');
    assert(sets[1].name === 'pentium', 'second song name');
    assert(sets[1].startBeat === 64, 'second song start');
    assert(sets[1].endBeat === 96, 'second song end');
})();

// markers outside any { } pair are ignored
(function() {
    var sets = MarkerSets.groupMarkers([
        m('orphan1', 0),
        m('{ song', 8),
        m('inner', 16),
        m('}', 24),
        m('orphan2', 32)
    ]);
    assert(sets.length === 1, 'orphans dropped, one valid song');
    assert(sets[0].markers.length === 3, '{ + inner + }');
})();

// closer with no opener is ignored
(function() {
    var sets = MarkerSets.groupMarkers([
        m('}', 0),
        m('{ song', 8),
        m('}', 16)
    ]);
    assert(sets.length === 1, 'lone closer dropped');
    assert(sets[0].name === 'song', 'good song still parsed');
})();

// reopening discards an unclosed song
(function() {
    var sets = MarkerSets.groupMarkers([
        m('{ amy', 0),
        m('intro', 8),
        m('{ pentium', 16),
        m('verse', 24),
        m('}', 32)
    ]);
    assert(sets.length === 1, 'unclosed song dropped');
    assert(sets[0].name === 'pentium', 'second opener wins');
})();

// "{songname" without space still works
(function() {
    var sets = MarkerSets.groupMarkers([
        m('{nospace', 0),
        m('}', 8)
    ]);
    assert(sets.length === 1, 'one song');
    assert(sets[0].name === 'nospace', 'name without leading space');
})();

// findSongIndexContainingBeat: basic
(function() {
    var sets = MarkerSets.groupMarkers([
        m('{ a', 0),  m('}', 16),
        m('{ b', 16), m('}', 32),
        m('{ c', 32), m('}', 48)
    ]);
    assert(MarkerSets.findSongIndexContainingBeat(sets, 0) === 0, 'beat 0 -> a');
    assert(MarkerSets.findSongIndexContainingBeat(sets, 8) === 0, 'beat 8 -> a');
    assert(MarkerSets.findSongIndexContainingBeat(sets, 16) === 1, 'beat 16 -> b (closer is exclusive)');
    assert(MarkerSets.findSongIndexContainingBeat(sets, 47) === 2, 'beat 47 -> c');
    assert(MarkerSets.findSongIndexContainingBeat(sets, 48) === -1, 'beat at last closer -> none');
    assert(MarkerSets.findSongIndexContainingBeat(sets, 100) === -1, 'past end -> none');
})();

// findSongIndexContainingBeat: gaps between songs
(function() {
    var sets = MarkerSets.groupMarkers([
        m('{ a', 0),   m('}', 16),
        m('{ b', 100), m('}', 132)
    ]);
    assert(MarkerSets.findSongIndexContainingBeat(sets, 50) === -1, 'gap between songs');
    assert(MarkerSets.findSongIndexContainingBeat(sets, 100) === 1, 'start of song b');
})();

process.exit(t.summary('MarkerSets'));
