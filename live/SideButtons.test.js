var SideButtonsHW = require('./SideButtons');
var t = require('../test-assert');
var assert = t.assert;

function fakeLaunchpad() {
    return {
        colors: { off:0, red:5, cyan:41, amber:17, purple:49 },
        sideButtons: { stop:49, mute:39, solo:29, sendA:69, sendB:59, volume:89, pan:79, recordArm:19 },
        _sideHandlers: {}, _sideColors: {},
        registerSideButton: function(n, fn, page) { this._sideHandlers[n] = { fn: fn, page: page }; },
        setSideButtonColor: function(n, c) { this._sideColors[n] = c; }
    };
}

function fakeBitwig() {
    return {
        _actions: [],
        invokeAction: function(id) { this._actions.push(id); }
    };
}

function fakeExplorer(songs) {
    return { getSongs: function() { return songs; } };
}

function fakeHost() {
    return {
        _popups: [],
        showPopupNotification: function(s) { this._popups.push(s); }
    };
}

var ACT = { STOP: 'stop_act', TOGGLE_ARRANGER_LOOP: 'loop_act', TOGGLE_METRONOME: 'metro_act' };

(function() {
    var lp = fakeLaunchpad(); var bw = fakeBitwig();
    var pe = fakeExplorer([{ name: 'amy' }, { name: 'pentium' }]);
    var hh = fakeHost();
    var sb = new SideButtonsHW({
        launchpad: lp, bitwig: bw, bitwigActions: ACT,
        projectExplorer: pe, host: hh, pageNumber: 2
    });
    sb.init();

    lp._sideHandlers[49].fn();
    assert(bw._actions[0] === 'stop_act', 'stop wired');
    lp._sideHandlers[29].fn();
    assert(bw._actions[1] === 'loop_act', 'loop wired');
    lp._sideHandlers[39].fn();
    assert(bw._actions[2] === 'metro_act', 'metronome wired');

    lp._sideHandlers[69].fn();
    assert(hh._popups.length === 1, 'setlist popup shown');
    assert(hh._popups[0].indexOf('amy') !== -1, 'contains amy');
    assert(hh._popups[0].indexOf('pentium') !== -1, 'contains pentium');
})();

// no songs -> friendly empty popup
(function() {
    var lp = fakeLaunchpad(); var bw = fakeBitwig();
    var pe = fakeExplorer([]);
    var hh = fakeHost();
    var sb = new SideButtonsHW({
        launchpad: lp, bitwig: bw, bitwigActions: ACT,
        projectExplorer: pe, host: hh, pageNumber: 2
    });
    sb.init();
    lp._sideHandlers[69].fn();
    assert(hh._popups.length === 1, 'popup shown');
    assert(hh._popups[0].indexOf('no songs') !== -1, 'empty notice');
})();

// page-aware: handlers register with the explorer page number
(function() {
    var lp = fakeLaunchpad(); var bw = fakeBitwig();
    var pe = fakeExplorer([]);
    var hh = fakeHost();
    var sb = new SideButtonsHW({
        launchpad: lp, bitwig: bw, bitwigActions: ACT,
        projectExplorer: pe, host: hh, pageNumber: 2
    });
    sb.init();
    assert(lp._sideHandlers[49].page === 2, 'stop bound to page 2');
    assert(lp._sideHandlers[69].page === 2, 'sendA bound to page 2');
})();

process.exit(t.summary('SideButtons'));
