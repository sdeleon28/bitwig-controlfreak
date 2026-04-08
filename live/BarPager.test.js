var BarPagerHW = require('./BarPager');
var t = require('../test-assert');
var assert = t.assert;

function fakeLaunchpad() {
    return {
        colors: { off: 0, purple: 49 },
        buttons: { barPagePrev: 110, barPageNext: 111 },
        _topHandlers: {}, _topColors: {},
        registerTopButton: function(cc, fn) { this._topHandlers[cc] = fn; },
        setTopButtonColor: function(cc, c) { this._topColors[cc] = c; }
    };
}
function fakePager(active) { return { isPageActive: function(p) { return p === active; } }; }
function fakeExplorer(page, total) {
    return {
        _page: page, _total: total, _calls: [],
        getCurrentBarPage: function() { return this._page; },
        getTotalBarPages: function() { return this._total; },
        barPagePrev: function() { this._page = Math.max(0, this._page - 1); this._calls.push('prev'); },
        barPageNext: function() { this._page = Math.min(this._total - 1, this._page + 1); this._calls.push('next'); }
    };
}

(function() {
    var lp = fakeLaunchpad(); var pg = fakePager(2);
    var pe = fakeExplorer(0, 3);
    var bp = new BarPagerHW({ launchpad: lp, pager: pg, projectExplorer: pe, pageNumber: 2 });
    bp.init();
    lp._topHandlers[111]();
    assert(pe._page === 1, 'next called');
    lp._topHandlers[110]();
    assert(pe._page === 0, 'prev called');
})();

(function() {
    var lp = fakeLaunchpad(); var pg = fakePager(2);
    var pe = fakeExplorer(1, 3);
    var bp = new BarPagerHW({ launchpad: lp, pager: pg, projectExplorer: pe, pageNumber: 2 });
    bp.refreshButtons();
    assert(lp._topColors[110] === lp.colors.purple, 'prev purple');
    assert(lp._topColors[111] === lp.colors.purple, 'next purple');
})();

process.exit(t.summary('BarPager'));
