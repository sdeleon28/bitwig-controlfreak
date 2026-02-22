var PagesHW = require('./Pages');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    var calls = [];
    return {
        calls: calls,
        colors: { off: 0, purple: 49, red: 5, white: 3 },
        setPadColor: function(pad, color) { calls.push({ method: 'setPadColor', pad: pad, color: color }); },
        setTopButtonColor: function(cc, color) { calls.push({ method: 'setTopButtonColor', cc: cc, color: color }); },
        clearAllPadBehaviors: function() { calls.push({ method: 'clearAllPadBehaviors' }); }
    };
}

function fakePager() {
    var calls = [];
    return {
        calls: calls,
        switchToPage: function(pageNum) { calls.push({ method: 'switchToPage', pageNum: pageNum }); }
    };
}

function fakePage(opts) {
    opts = opts || {};
    var calls = [];
    return {
        calls: calls,
        id: opts.id || 'test-page',
        pageNumber: opts.pageNumber || 1,
        init: function() { calls.push('init'); },
        show: function() { calls.push('show'); },
        hide: function() { calls.push('hide'); },
        handlePadPress: function(padNote) { calls.push({ method: 'handlePadPress', padNote: padNote }); return true; },
        handlePadRelease: function(padNote) { calls.push({ method: 'handlePadRelease', padNote: padNote }); return true; }
    };
}

function fakeProjectExplorer(opts) {
    opts = opts || {};
    return {
        _timeSelectActive: opts.timeSelectActive || false,
        modifiers: { timeSelect: 19 },
        resetTimeSelectGesture: function() { this._timeSelectActive = false; this._resetCalled = true; },
        _resetCalled: false
    };
}

function makePages(opts) {
    opts = opts || {};
    return new PagesHW({
        pager: opts.pager || fakePager(),
        launchpad: opts.launchpad || fakeLaunchpad(),
        projectExplorer: opts.projectExplorer || null,
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// registerPage tracks pages and updates totalPages
(function() {
    var pages = makePages();
    var p1 = fakePage({ id: 'main', pageNumber: 1 });
    var p2 = fakePage({ id: 'explorer', pageNumber: 2 });
    var p5 = fakePage({ id: 'palette', pageNumber: 5 });

    pages.registerPage(p1);
    pages.registerPage(p2);
    pages.registerPage(p5);

    assert(pages.getPageByNumber(1) === p1, 'page 1 registered');
    assert(pages.getPageByNumber(2) === p2, 'page 2 registered');
    assert(pages.getPageByNumber(5) === p5, 'page 5 registered');
    assert(pages._totalPages === 5, 'totalPages updated to 5');
})();

// getPageByNumber returns null for unregistered page
(function() {
    var pages = makePages();
    assert(pages.getPageByNumber(99) === null, 'unregistered page returns null');
})();

// getCurrentPage returns the current page
(function() {
    var pages = makePages();
    var p1 = fakePage({ pageNumber: 1 });
    pages.registerPage(p1);
    assert(pages.getCurrentPage() === p1, 'getCurrentPage returns page 1');
})();

// switchToPage calls hide on old page, show on new page, delegates to pager
(function() {
    var pager = fakePager();
    var lp = fakeLaunchpad();
    var pages = makePages({ pager: pager, launchpad: lp });

    var p1 = fakePage({ pageNumber: 1 });
    var p2 = fakePage({ pageNumber: 2 });
    pages.registerPage(p1);
    pages.registerPage(p2);

    pages.switchToPage(2);

    assert(p1.calls.indexOf('hide') !== -1, 'old page hide called');
    assert(p2.calls.indexOf('show') !== -1, 'new page show called');
    assert(pages._currentPageNumber === 2, 'current page updated to 2');

    var pagerSwitch = pager.calls.find(function(c) { return c.method === 'switchToPage'; });
    assert(pagerSwitch && pagerSwitch.pageNum === 2, 'pager.switchToPage(2) called');

    var clearBehaviors = lp.calls.find(function(c) { return c.method === 'clearAllPadBehaviors'; });
    assert(clearBehaviors, 'clearAllPadBehaviors called');
})();

// switchToPage resets ProjectExplorer time select gesture when active
(function() {
    var pe = fakeProjectExplorer({ timeSelectActive: true });
    var lp = fakeLaunchpad();
    var pages = makePages({ launchpad: lp, projectExplorer: pe });

    var p1 = fakePage({ pageNumber: 1 });
    var p2 = fakePage({ pageNumber: 2 });
    pages.registerPage(p1);
    pages.registerPage(p2);

    pages.switchToPage(2);

    assert(pe._resetCalled === true, 'resetTimeSelectGesture called');
    assert(pe._timeSelectActive === false, 'time select deactivated');
    var redPaint = lp.calls.find(function(c) {
        return c.method === 'setPadColor' && c.pad === 19 && c.color === 5;
    });
    assert(redPaint, 'time select modifier painted red');
})();

// switchToPage does nothing when projectExplorer time select is not active
(function() {
    var pe = fakeProjectExplorer({ timeSelectActive: false });
    var pages = makePages({ projectExplorer: pe });

    var p1 = fakePage({ pageNumber: 1 });
    var p2 = fakePage({ pageNumber: 2 });
    pages.registerPage(p1);
    pages.registerPage(p2);

    pages.switchToPage(2);
    assert(pe._resetCalled === false, 'resetTimeSelectGesture not called when not active');
})();

// switchToPage works without projectExplorer (null)
(function() {
    var pages = makePages({ projectExplorer: null });
    var p1 = fakePage({ pageNumber: 1 });
    var p2 = fakePage({ pageNumber: 2 });
    pages.registerPage(p1);
    pages.registerPage(p2);

    // Should not throw
    pages.switchToPage(2);
    assert(pages._currentPageNumber === 2, 'switch works without projectExplorer');
})();

// nextPage navigates forward
(function() {
    var pages = makePages();
    var p1 = fakePage({ pageNumber: 1 });
    var p2 = fakePage({ pageNumber: 2 });
    var p3 = fakePage({ pageNumber: 3 });
    pages.registerPage(p1);
    pages.registerPage(p2);
    pages.registerPage(p3);

    pages.nextPage();
    assert(pages._currentPageNumber === 2, 'nextPage goes to 2');
    pages.nextPage();
    assert(pages._currentPageNumber === 3, 'nextPage goes to 3');
    pages.nextPage();
    assert(pages._currentPageNumber === 3, 'nextPage clamped at 3');
})();

// previousPage navigates backward
(function() {
    var pages = makePages();
    var p1 = fakePage({ pageNumber: 1 });
    var p2 = fakePage({ pageNumber: 2 });
    var p3 = fakePage({ pageNumber: 3 });
    pages.registerPage(p1);
    pages.registerPage(p2);
    pages.registerPage(p3);

    pages.switchToPage(3);
    pages.previousPage();
    assert(pages._currentPageNumber === 2, 'previousPage goes to 2');
    pages.previousPage();
    assert(pages._currentPageNumber === 1, 'previousPage goes to 1');
    pages.previousPage();
    assert(pages._currentPageNumber === 1, 'previousPage clamped at 1');
})();

// refreshPageButtons sets correct colors at boundaries
(function() {
    var lp = fakeLaunchpad();
    var pages = makePages({ launchpad: lp });
    var p1 = fakePage({ pageNumber: 1 });
    var p2 = fakePage({ pageNumber: 2 });
    var p3 = fakePage({ pageNumber: 3 });
    pages.registerPage(p1);
    pages.registerPage(p2);
    pages.registerPage(p3);

    // On page 1: prev=off, next=purple
    lp.calls.length = 0;
    pages.refreshPageButtons();
    var prevOff = lp.calls.find(function(c) { return c.cc === 104 && c.color === 0; });
    var nextPurple = lp.calls.find(function(c) { return c.cc === 105 && c.color === 49; });
    assert(prevOff, 'page 1: prev button off');
    assert(nextPurple, 'page 1: next button purple');

    // On page 2: both purple
    pages.switchToPage(2);
    lp.calls.length = 0;
    pages.refreshPageButtons();
    var prevPurple = lp.calls.find(function(c) { return c.cc === 104 && c.color === 49; });
    nextPurple = lp.calls.find(function(c) { return c.cc === 105 && c.color === 49; });
    assert(prevPurple, 'page 2: prev button purple');
    assert(nextPurple, 'page 2: next button purple');

    // On page 3: prev=purple, next=off
    pages.switchToPage(3);
    lp.calls.length = 0;
    pages.refreshPageButtons();
    prevPurple = lp.calls.find(function(c) { return c.cc === 104 && c.color === 49; });
    var nextOff = lp.calls.find(function(c) { return c.cc === 105 && c.color === 0; });
    assert(prevPurple, 'page 3: prev button purple');
    assert(nextOff, 'page 3: next button off');
})();

// handlePadPress delegates to current page
(function() {
    var pages = makePages();
    var p1 = fakePage({ pageNumber: 1 });
    pages.registerPage(p1);

    var result = pages.handlePadPress(44);
    assert(result === true, 'handlePadPress returns true');
    var press = p1.calls.find(function(c) { return c.method === 'handlePadPress'; });
    assert(press && press.padNote === 44, 'padPress delegated with correct note');
})();

// handlePadRelease delegates to current page
(function() {
    var pages = makePages();
    var p1 = fakePage({ pageNumber: 1 });
    pages.registerPage(p1);

    var result = pages.handlePadRelease(44);
    assert(result === true, 'handlePadRelease returns true');
    var release = p1.calls.find(function(c) { return c.method === 'handlePadRelease'; });
    assert(release && release.padNote === 44, 'padRelease delegated with correct note');
})();

// handlePadPress returns false when no current page
(function() {
    var pages = makePages();
    assert(pages.handlePadPress(44) === false, 'returns false with no page');
    assert(pages.handlePadRelease(44) === false, 'release returns false with no page');
})();

// out-of-bounds page switch is ignored
(function() {
    var pages = makePages();
    var p1 = fakePage({ pageNumber: 1 });
    pages.registerPage(p1);

    pages.switchToPage(0);
    assert(pages._currentPageNumber === 1, 'page 0 ignored');
    pages.switchToPage(99);
    assert(pages._currentPageNumber === 1, 'page 99 ignored');
})();

// same-page switch is ignored
(function() {
    var pager = fakePager();
    var pages = makePages({ pager: pager });
    var p1 = fakePage({ pageNumber: 1 });
    pages.registerPage(p1);

    pages.switchToPage(1);
    assert(pager.calls.length === 0, 'same-page switch does nothing');
})();

// init calls init on all registered pages
(function() {
    var lp = fakeLaunchpad();
    var pages = makePages({ launchpad: lp });
    var p1 = fakePage({ pageNumber: 1 });
    var p2 = fakePage({ pageNumber: 2 });
    pages.registerPage(p1);
    pages.registerPage(p2);

    pages.init();
    assert(p1.calls.indexOf('init') !== -1, 'page 1 init called');
    assert(p2.calls.indexOf('init') !== -1, 'page 2 init called');
    assert(p1.calls.indexOf('show') !== -1, 'current page shown after init');
})();

// ---- summary ----

process.exit(t.summary('Pages'));
