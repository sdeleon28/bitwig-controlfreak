var ControllerHW = require('./Controller');
var t = require('../test-assert');
var assert = t.assert;

function fakeMasterTrack(muted) {
    var _muted = muted || false;
    return {
        _master: true,
        mute: function() {
            return {
                get: function() { return _muted; },
                toggle: function() { _muted = !_muted; this._toggled = (this._toggled || 0) + 1; },
                _toggled: 0
            };
        }
    };
}

function fakeBitwig(slotMap, transport, masterTrack) {
    var trackUpdateSubs = [];
    var masterMuteSubs = [];
    var _master = masterTrack || fakeMasterTrack();
    return {
        _slotMap: slotMap,
        getSlotMap: function() { return this._slotMap; },
        getMasterTrack: function() { return _master; },
        getTransport: function() { return transport || null; },
        onTracksUpdated: function(cb) { trackUpdateSubs.push(cb); },
        onMasterMuteChanged: function(cb) { masterMuteSubs.push(cb); },
        isMasterMuted: function() { return _master.mute().get(); },
        _trigger: function() { trackUpdateSubs.forEach(function(cb){ cb(); }); },
        _triggerMasterMute: function() { masterMuteSubs.forEach(function(cb){ cb(); }); }
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
        colors: { red: 5, green: 21 },
        buttons: { masterMute: 110 },
        _topHandlers: {}, _topPresses: 0, _padPresses: 0, _padReleases: 0, _sidePresses: 0, _topColors: {},
        registerTopButton: function(cc, fn) { this._topHandlers[cc] = fn; },
        setTopButtonColor: function(cc, c) { this._topColors[cc] = c; },
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
    var pe = { pageNumber: 2, init: noop, rebuildFromBitwig: noop };
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

// master mute toggle: cc 110 toggles master track mute
(function() {
    var s = makeController();
    var master = s.bw.getMasterTrack();
    var muteBefore = master.mute().get();
    s.ctrl.onLaunchpadMidi(0xB0, 110, 127);
    assert(master.mute().get() !== muteBefore, 'cc 110 toggled master mute');
})();

// master mute button color: green when unmuted, red when muted
(function() {
    var s = makeController();
    s.ctrl.refreshMasterMuteButton();
    assert(s.lp._topColors[110] === s.lp.colors.green, 'unmuted -> green');
    // Toggle to muted
    s.bw.getMasterTrack().mute().toggle();
    s.ctrl.refreshMasterMuteButton();
    assert(s.lp._topColors[110] === s.lp.colors.red, 'muted -> red');
})();

// master mute button survives page switch via _onPageChanged callback
(function() {
    var s = makeController();
    var mp = s.ctrl.mainPager;
    s.ctrl.refreshMasterMuteButton();
    assert(s.lp._topColors[110] === s.lp.colors.green, 'green before page switch');
    // Simulate page switch clearing the button
    s.lp._topColors = {};
    assert(mp._onPageChanged !== null, 'onPageChanged callback set');
    mp._onPageChanged();
    assert(s.lp._topColors[110] === s.lp.colors.green, 'green restored after page switch');
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
