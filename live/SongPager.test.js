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
    return {
        _idx: idx, _count: count, _switches: [],
        getCurrentSongIndex: function() { return this._idx; },
        getSongCount: function() { return this._count; },
        setSong: function(i) { this._idx = i; this._switches.push(i); }
    };
}

// next and previous walk songs
(function() {
    var lp = fakeLaunchpad(); var pg = fakePager(2);
    var pe = fakeExplorer(3, 0);
    var sp = new SongPagerHW({ launchpad: lp, pager: pg, projectExplorer: pe, pageNumber: 2 });
    sp.init();
    lp._topHandlers[107]();  // right
    assert(pe._switches[0] === 1, 'next -> song 1');
    lp._topHandlers[106]();  // left
    assert(pe._switches[1] === 0, 'prev -> song 0');
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

process.exit(t.summary('SongPager'));
