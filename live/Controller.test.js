var ControllerHW = require('./Controller');
var t = require('../test-assert');
var assert = t.assert;

function fakeBitwig(slotMap, transport) {
    var trackUpdateSubs = [];
    return {
        _slotMap: slotMap,
        getSlotMap: function() { return this._slotMap; },
        getMasterTrack: function() { return { _master: true }; },
        getTransport: function() { return transport || null; },
        onTracksUpdated: function(cb) { trackUpdateSubs.push(cb); },
        _trigger: function() { trackUpdateSubs.forEach(function(cb){ cb(); }); }
    };
}

function fakeTwister() {
    return {
        _links: {},
        _master: null,
        _unlinks: 0,
        _ccTurns: [],
        _ccPresses: [],
        unlinkAll: function() { this._unlinks++; this._links = {}; this._master = null; },
        linkEncoderToTrack: function(enc, tid) { this._links[enc] = tid; },
        linkEncoderToMaster: function(enc, m) { this._master = enc; },
        ccToEncoder: function(cc) { return cc + 1; },
        handleEncoderTurn: function(enc, v) { this._ccTurns.push([enc, v]); },
        handleEncoderPress: function(enc, p) { this._ccPresses.push([enc, p]); }
    };
}

function fakeLaunchpad() {
    return {
        buttons: { decreaseResolution: 108, increaseResolution: 109 },
        _topHandlers: {}, _topPresses: 0, _padPresses: 0, _padReleases: 0, _sidePresses: 0,
        registerTopButton: function(cc, fn) { this._topHandlers[cc] = fn; },
        handleTopButtonPress: function(cc) { if (this._topHandlers[cc]) { this._topHandlers[cc](); this._topPresses++; return true; } return false; },
        handlePadPress: function() { this._padPresses++; return true; },
        handlePadRelease: function() { this._padReleases++; return true; },
        isSideButton: function(n) { return n === 49; },
        handleSideButtonPress: function() { this._sidePresses++; return true; }
    };
}

function noop() {}

function makeController() {
    var bw = fakeBitwig({ 1: 7, 3: 9 });
    var tw = fakeTwister();
    var lp = fakeLaunchpad();
    var pe = { pageNumber: 2, decreaseResolution: function(){this._dec=(this._dec||0)+1;}, increaseResolution: function(){this._inc=(this._inc||0)+1;}, init: noop, rebuildFromBitwig: noop };
    var pc = { init: noop, paint: noop };
    var ctrl = new ControllerHW({
        bitwig: bw, launchpad: lp, twister: tw,
        pager: { init: noop, switchToPage: noop, getActivePage: function(){return 1;}, isPageActive: function(){return true;} },
        mainPager: { init: noop },
        songPager: { init: noop, refreshButtons: noop },
        barPager: { init: noop, refreshButtons: noop },
        modeSwitcher: { init: noop },
        sideButtons: { init: noop },
        pageControl: pc,
        pageProjectExplorer: pe,
        host: null
    });
    ctrl.init();
    return { ctrl: ctrl, bw: bw, tw: tw, lp: lp, pe: pe };
}

// relinkEncoders maps slot N -> encoder N, and master -> encoder 16
(function() {
    var s = makeController();
    s.ctrl.relinkEncoders();
    assert(s.tw._unlinks > 0, 'unlinkAll called');
    assert(s.tw._links[1] === 7, 'slot 1 -> track 7 -> encoder 1');
    assert(s.tw._links[3] === 9, 'slot 3 -> track 9 -> encoder 3');
    assert(s.tw._master === 16, 'master -> encoder 16');
})();

// onTracksUpdated triggers a relink
(function() {
    var s = makeController();
    var unlinksBefore = s.tw._unlinks;
    s.bw._trigger();
    assert(s.tw._unlinks > unlinksBefore, 'tracks updated -> relinkEncoders');
})();

// onLaunchpadMidi: CC -> top button
(function() {
    var s = makeController();
    s.ctrl.onLaunchpadMidi(0xB0, 108, 127);
    assert(s.pe._dec === 1, 'cc 108 -> decreaseResolution');
})();

// onLaunchpadMidi: note on side button
(function() {
    var s = makeController();
    s.ctrl.onLaunchpadMidi(0x90, 49, 127);
    assert(s.lp._sidePresses === 1, 'side button press routed');
})();

// onLaunchpadMidi: note on grid pad
(function() {
    var s = makeController();
    s.ctrl.onLaunchpadMidi(0x90, 11, 127);
    assert(s.lp._padPresses === 1, 'pad press routed');
    s.ctrl.onLaunchpadMidi(0x80, 11, 0);
    assert(s.lp._padReleases === 1, 'pad release routed');
})();

// onTwisterMidi: cc -> turn
(function() {
    var s = makeController();
    s.ctrl.onTwisterMidi(0xB0, 5, 64);
    assert(s.tw._ccTurns.length === 1, 'turn routed');
    assert(s.tw._ccTurns[0][1] === 64, 'value forwarded');
})();

// onTwisterMidi: cc on channel 2 -> press
(function() {
    var s = makeController();
    s.ctrl.onTwisterMidi(0xB1, 5, 127);
    assert(s.tw._ccPresses.length === 1, 'press routed');
    assert(s.tw._ccPresses[0][1] === true, 'pressed=true');
})();

process.exit(t.summary('Controller (live)'));
