var MainPagerHW = require('./MainPager');
var t = require('../test-assert');
var assert = t.assert;

function fakeLaunchpad() {
    return {
        colors: { off: 0, purple: 49 },
        buttons: { up: 104, down: 105 },
        _topHandlers: {},
        _topColors: {},
        registerTopButton: function(cc, fn) { this._topHandlers[cc] = fn; },
        setTopButtonColor: function(cc, color) { this._topColors[cc] = color; }
    };
}

function fakePager() {
    return {
        _active: null,
        _switches: [],
        init: function(p) { this._active = p; },
        switchToPage: function(p) { this._switches.push(p); this._active = p; },
        getActivePage: function() { return this._active; }
    };
}

function fakePage(num) {
    return {
        pageNumber: num,
        _painted: 0,
        paint: function() { this._painted++; }
    };
}

// init paints the first page and sets active
(function() {
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var p1 = fakePage(1), p2 = fakePage(2);
    var mp = new MainPagerHW({ launchpad: lp, pager: pg, pages: [p1, p2] });
    mp.init();
    assert(pg._active === 1, 'first page is active');
    assert(p1._painted === 1, 'first page painted on init');
    assert(p2._painted === 0, 'second page not painted');
})();

// down advances, up goes back
(function() {
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var p1 = fakePage(1), p2 = fakePage(2);
    var mp = new MainPagerHW({ launchpad: lp, pager: pg, pages: [p1, p2] });
    mp.init();
    lp._topHandlers[104]; // sanity: registered
    assert(typeof lp._topHandlers[104] === 'function', 'up registered');
    assert(typeof lp._topHandlers[105] === 'function', 'down registered');

    lp._topHandlers[105](); // down
    assert(pg._switches.length === 1 && pg._switches[0] === 2, 'switched to page 2');
    assert(p2._painted === 1, 'page 2 painted after switch');

    lp._topHandlers[104](); // up
    assert(pg._switches.length === 2 && pg._switches[1] === 1, 'switched back to page 1');
})();

// up at index 0 is a no-op; down at last is a no-op
(function() {
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var p1 = fakePage(1), p2 = fakePage(2);
    var mp = new MainPagerHW({ launchpad: lp, pager: pg, pages: [p1, p2] });
    mp.init();
    lp._topHandlers[104](); // up at index 0
    assert(pg._switches.length === 0, 'up at first page is a no-op');
    lp._topHandlers[105](); // down to 1
    lp._topHandlers[105](); // down at last
    assert(pg._switches.length === 1, 'down at last page is a no-op');
})();

// nav button colors reflect available directions
(function() {
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var p1 = fakePage(1), p2 = fakePage(2);
    var mp = new MainPagerHW({ launchpad: lp, pager: pg, pages: [p1, p2] });
    mp.init();
    assert(lp._topColors[104] === lp.colors.off, 'up off at start');
    assert(lp._topColors[105] === lp.colors.purple, 'down purple at start');
    lp._topHandlers[105]();
    assert(lp._topColors[104] === lp.colors.purple, 'up purple after going down');
    assert(lp._topColors[105] === lp.colors.off, 'down off at last page');
})();

process.exit(t.summary('MainPager'));
