var SongPagerHW = require('./SongPager');
var t = require('../test-assert');
var assert = t.assert;

function fakeLaunchpad() {
    return {
        colors: { off: 0, purple: 49 },
        buttons: { left: 106, right: 107 },
        _topHandlers: {}, _topColors: {},
        registerTopButton: function(cc, fn) { this._topHandlers[cc] = fn; },
        setTopButtonColor: function(cc, c) { this._topColors[cc] = c; }
    };
}
function fakePager(active) {
    return { isPageActive: function(p) { return p === active; } };
}
function fakeExplorer(count, idx) {
    var songs = [];
    for (var i = 0; i < count; i++) songs.push({ name: 'song ' + i });
    return {
        _idx: idx, _count: count, _switches: [], _songs: songs,
        getCurrentSongIndex: function() { return this._idx; },
        getSongCount: function() { return this._count; },
        getSongs: function() { return this._songs; },
        setSong: function(i) { this._idx = i; this._switches.push(i); }
    };
}
function fakeHost() {
    return { _popups: [], showPopupNotification: function(s) { this._popups.push(s); } };
}
function fakeBitwig(playing) {
    return {
        _playing: !!playing, _playCb: null,
        isPlaying: function() { return this._playing; },
        onIsPlayingChanged: function(cb) { this._playCb = cb; }
    };
}

// next and previous walk songs and growl the song name
(function() {
    var lp = fakeLaunchpad(); var pg = fakePager(2);
    var pe = fakeExplorer(3, 0);
    var hh = fakeHost();
    var sp = new SongPagerHW({
        launchpad: lp, pager: pg, projectExplorer: pe, host: hh, pageNumber: 2
    });
    sp.init();
    lp._topHandlers[107]();  // right
    assert(pe._switches[0] === 1, 'next -> song 1');
    assert(hh._popups[0] === 'song 1', 'next growls new song name');
    lp._topHandlers[106]();  // left
    assert(pe._switches[1] === 0, 'prev -> song 0');
    assert(hh._popups[1] === 'song 0', 'prev growls new song name');
})();

// no-op at boundaries
(function() {
    var lp = fakeLaunchpad(); var pg = fakePager(2);
    var pe = fakeExplorer(2, 0);
    var sp = new SongPagerHW({ launchpad: lp, pager: pg, projectExplorer: pe, pageNumber: 2 });
    sp.init();
    lp._topHandlers[106]();  // left at 0
    assert(pe._switches.length === 0, 'left at 0 no-op');
    lp._topHandlers[107]();
    lp._topHandlers[107]();  // right past end
    assert(pe._switches.length === 1, 'right past end no-op');
})();

// button colors reflect availability
(function() {
    var lp = fakeLaunchpad(); var pg = fakePager(2);
    var pe = fakeExplorer(3, 1);
    var sp = new SongPagerHW({ launchpad: lp, pager: pg, projectExplorer: pe, pageNumber: 2 });
    sp.refreshButtons();
    assert(lp._topColors[106] === lp.colors.purple, 'left purple');
    assert(lp._topColors[107] === lp.colors.purple, 'right purple');
})();

// disabled during playback: prev/next no-op and buttons go dark
(function() {
    var lp = fakeLaunchpad(); var pg = fakePager(2);
    var pe = fakeExplorer(3, 1);
    var bw = fakeBitwig(true);
    var sp = new SongPagerHW({
        launchpad: lp, pager: pg, projectExplorer: pe, bitwig: bw, pageNumber: 2
    });
    sp.init();
    lp._topHandlers[107]();  // right
    lp._topHandlers[106]();  // left
    assert(pe._switches.length === 0, 'no song switch while playing');
    sp.refreshButtons();
    assert(lp._topColors[106] === lp.colors.off, 'left dark while playing');
    assert(lp._topColors[107] === lp.colors.off, 'right dark while playing');
})();

// transitioning from playing to stopped re-lights the buttons
(function() {
    var lp = fakeLaunchpad(); var pg = fakePager(2);
    var pe = fakeExplorer(3, 1);
    var bw = fakeBitwig(true);
    var sp = new SongPagerHW({
        launchpad: lp, pager: pg, projectExplorer: pe, bitwig: bw, pageNumber: 2
    });
    sp.init();
    sp.refreshButtons();
    assert(lp._topColors[106] === lp.colors.off, 'dark while playing');
    bw._playing = false;
    bw._playCb();  // simulate Bitwig firing the play-state observer
    assert(lp._topColors[106] === lp.colors.purple, 'left lit when stopped');
    assert(lp._topColors[107] === lp.colors.purple, 'right lit when stopped');
})();

process.exit(t.summary('SongPager'));
