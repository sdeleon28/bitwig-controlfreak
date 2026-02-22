var BitwigActions = require('./BitwigActions');
var t = require('./test-assert');
var assert = t.assert;

// BitwigActions is a plain object with string constants
(function() {
    assert(typeof BitwigActions === 'object', 'BitwigActions is an object');
    assert(BitwigActions !== null, 'BitwigActions is not null');
})();

// Has a large number of action constants
(function() {
    var keys = Object.keys(BitwigActions);
    assert(keys.length > 100, 'BitwigActions has more than 100 keys (got ' + keys.length + ')');
})();

// All values are strings
(function() {
    var keys = Object.keys(BitwigActions);
    var allStrings = keys.every(function(k) { return typeof BitwigActions[k] === 'string'; });
    assert(allStrings, 'all BitwigActions values are strings');
})();

// Representative transport actions exist
(function() {
    assert(BitwigActions.PLAY === "Play Transport", 'PLAY action exists');
    assert(BitwigActions.STOP === "Stop Transport", 'STOP action exists');
    assert(BitwigActions.TOGGLE_RECORD === "Toggle Record", 'TOGGLE_RECORD action exists');
})();

// Representative selection actions exist
(function() {
    assert(BitwigActions.SELECT_ALL === "Select All", 'SELECT_ALL action exists');
    assert(BitwigActions.UNSELECT_ALL === "Unselect All", 'UNSELECT_ALL action exists');
})();

// Representative panel actions exist
(function() {
    assert(BitwigActions.TOGGLE_BROWSER === "toggle_browser_panel", 'TOGGLE_BROWSER action exists');
    assert(BitwigActions.TOGGLE_MIXER === "toggle_mixer", 'TOGGLE_MIXER action exists');
})();

// Time editing actions exist (used by marker/copy features)
(function() {
    assert(BitwigActions.INSERT_SILENCE === "insert_silence", 'INSERT_SILENCE action exists');
    assert(BitwigActions.CUT_TIME === "cut_and_pull", 'CUT_TIME action exists');
    assert(BitwigActions.LOOP_SELECTION === "Loop Selection", 'LOOP_SELECTION action exists');
})();

process.exit(t.summary('BitwigActions'));
