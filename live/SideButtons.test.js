var SideButtonsHW = require('./SideButtons');
var t = require('../test-assert');
var assert = t.assert;

function fakeLaunchpad() {
    return {
        colors: { off:0, red:5, cyan:41, amber:17, yellow:13, purple:49 },
        sideButtons: { stop:49, mute:39, solo:29, sendA:69, sendB:59, volume:89, pan:79, recordArm:19 },
        pager: { isPageActive: function(){ return true; } },
        _sideHandlers: {}, _sideColors: {}, _sideFlashing: {},
        registerSideButton: function(n, fn, page) { this._sideHandlers[n] = { fn: fn, page: page }; },
        setSideButtonColor: function(n, c) { this._sideColors[n] = c; this._sideFlashing[n] = false; },
        setSideButtonColorFlashing: function(n, c) { this._sideColors[n] = c; this._sideFlashing[n] = true; }
    };
}

function fakeBitwig() {
    return {
        _actions: [],
        _loop: false,
        _metro: false,
        _playing: false,
        _loopCb: null,
        _metroCb: null,
        _playCb: null,
        invokeAction: function(id) { this._actions.push(id); },
        isLoopEnabled: function() { return this._loop; },
        isMetronomeEnabled: function() { return this._metro; },
        isPlaying: function() { return this._playing; },
        onLoopEnabledChanged: function(cb) { this._loopCb = cb; },
        onMetronomeEnabledChanged: function(cb) { this._metroCb = cb; },
        onIsPlayingChanged: function(cb) { this._playCb = cb; }
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
    lp._sideHandlers[39].fn();
    assert(bw._actions[1] === 'loop_act', 'mute -> loop wired');
    lp._sideHandlers[29].fn();
    assert(bw._actions[2] === 'metro_act', 'solo -> metronome wired');

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

// recordArm side button toggles the project-explorer time-select gesture
// and reflects state with a flashing red light
(function() {
    var lp = fakeLaunchpad(); var bw = fakeBitwig();
    var hh = fakeHost();
    var gestureActive = false;
    var toggleCount = 0;
    var pe = {
        getSongs: function() { return []; },
        toggleTimeSelect: function() {
            gestureActive = !gestureActive;
            toggleCount++;
            sb.refreshColors();
        },
        isTimeSelectActive: function() { return gestureActive; }
    };
    var sb = new SideButtonsHW({
        launchpad: lp, bitwig: bw, bitwigActions: ACT,
        projectExplorer: pe, host: hh, pageNumber: 2
    });
    sb.init();

    // Initially: recordArm off, not flashing
    assert(lp._sideColors[19] === lp.colors.off, 'recordArm off initially');
    assert(lp._sideFlashing[19] === false, 'recordArm not flashing initially');

    // Press recordArm: gesture active, flashing red
    lp._sideHandlers[19].fn();
    assert(toggleCount === 1, 'toggleTimeSelect called');
    assert(gestureActive === true, 'gesture active after first press');
    assert(lp._sideColors[19] === lp.colors.red, 'recordArm red while active');
    assert(lp._sideFlashing[19] === true, 'recordArm flashing while active');

    // Press recordArm again: cancels, light goes off
    lp._sideHandlers[19].fn();
    assert(gestureActive === false, 'gesture cancelled by second press');
    assert(lp._sideColors[19] === lp.colors.off, 'recordArm off after cancel');
    assert(lp._sideFlashing[19] === false, 'recordArm not flashing after cancel');
})();

process.exit(t.summary('SideButtons'));
