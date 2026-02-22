var LaunchpadQuadrantHW = require('./LaunchpadQuadrant');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    var cleared = [];
    var colors = {};
    return {
        cleared: cleared,
        padColors: colors,
        clearPad: function(pad) { cleared.push(pad); },
        setPadColor: function(pad, color) { colors[pad] = color; }
    };
}

function makeQuadrant(opts) {
    opts = opts || {};
    return new LaunchpadQuadrantHW({
        launchpad: opts.launchpad || fakeLaunchpad(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// bottomRight.getGroup maps pads to group numbers 1-16
(function() {
    var q = makeQuadrant();
    assert(q.bottomRight.getGroup(15) === 1, 'pad 15 -> group 1');
    assert(q.bottomRight.getGroup(18) === 4, 'pad 18 -> group 4');
    assert(q.bottomRight.getGroup(25) === 5, 'pad 25 -> group 5');
    assert(q.bottomRight.getGroup(48) === 16, 'pad 48 -> group 16');
})();

// bottomRight.getGroup returns null for unknown pads
(function() {
    var q = makeQuadrant();
    assert(q.bottomRight.getGroup(99) === null, 'unknown pad returns null');
    assert(q.bottomRight.getGroup(11) === null, 'bottomLeft pad returns null from bottomRight');
})();

// bottomLeft.getTrackNumber maps pads to track numbers 1-16
(function() {
    var q = makeQuadrant();
    assert(q.bottomLeft.getTrackNumber(11) === 1, 'pad 11 -> track 1');
    assert(q.bottomLeft.getTrackNumber(14) === 4, 'pad 14 -> track 4');
    assert(q.bottomLeft.getTrackNumber(21) === 5, 'pad 21 -> track 5');
    assert(q.bottomLeft.getTrackNumber(44) === 16, 'pad 44 -> track 16');
})();

// bottomLeft.getTrackNumber returns null for unknown pads
(function() {
    var q = makeQuadrant();
    assert(q.bottomLeft.getTrackNumber(99) === null, 'unknown pad returns null');
    assert(q.bottomLeft.getTrackNumber(15) === null, 'bottomRight pad returns null from bottomLeft');
})();

// highlightGroup clears all pads and highlights the selected group
(function() {
    var lp = fakeLaunchpad();
    var q = new LaunchpadQuadrantHW({ launchpad: lp, debug: false, println: function() {} });

    q.bottomRight.highlightGroup(3);

    // All 16 pads should be cleared
    assert(lp.cleared.length === 16, 'all 16 group pads cleared');
    // Group 3 = pad index 2 = pad note 17
    assert(lp.padColors[17] === 'green', 'group 3 pad highlighted green');
})();

// highlightGroup with out-of-range value only clears
(function() {
    var lp = fakeLaunchpad();
    var q = new LaunchpadQuadrantHW({ launchpad: lp, debug: false, println: function() {} });

    q.bottomRight.highlightGroup(0);

    assert(lp.cleared.length === 16, 'all pads cleared');
    assert(Object.keys(lp.padColors).length === 0, 'no pad highlighted');
})();

// bottomRight has correct 16 pad notes
(function() {
    var q = makeQuadrant();
    var expected = [15, 16, 17, 18, 25, 26, 27, 28, 35, 36, 37, 38, 45, 46, 47, 48];
    assert(q.bottomRight.pads.length === 16, 'bottomRight has 16 pads');
    for (var i = 0; i < expected.length; i++) {
        assert(q.bottomRight.pads[i] === expected[i], 'bottomRight pad ' + i + ' = ' + expected[i]);
    }
})();

// bottomLeft has correct 16 pad notes
(function() {
    var q = makeQuadrant();
    var expected = [11, 12, 13, 14, 21, 22, 23, 24, 31, 32, 33, 34, 41, 42, 43, 44];
    assert(q.bottomLeft.pads.length === 16, 'bottomLeft has 16 pads');
    for (var i = 0; i < expected.length; i++) {
        assert(q.bottomLeft.pads[i] === expected[i], 'bottomLeft pad ' + i + ' = ' + expected[i]);
    }
})();

// ---- summary ----

process.exit(t.summary('LaunchpadQuadrant'));
