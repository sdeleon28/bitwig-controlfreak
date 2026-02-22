var PageClipLauncherHW = require('./Page_ClipLauncher');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeClipLauncher() {
    var calls = [];
    return {
        calls: calls,
        registerPadBehaviors: function() { calls.push('registerPadBehaviors'); },
        refresh: function() { calls.push('refresh'); },
        launchScene: function(index) { calls.push({ method: 'launchScene', index: index }); }
    };
}

function fakePager() {
    var paints = [];
    var clears = [];
    var clearAlls = [];
    return {
        paints: paints,
        clears: clears,
        clearAlls: clearAlls,
        requestPaint: function(page, pad, color) { paints.push({ page: page, pad: pad, color: color }); },
        requestClear: function(page, pad) { clears.push({ page: page, pad: pad }); },
        requestClearAll: function(page) { clearAlls.push(page); }
    };
}

function fakeModeSwitcher() {
    return {
        modes: {
            volume:    { note: 89 },
            pan:       { note: 79 },
            mute:      { note: 69 },
            solo:      { note: 59 },
            recordArm: { note: 49 }
        }
    };
}

function fakeLaunchpad() {
    var calls = [];
    return {
        calls: calls,
        handlePadPress: function(padNote) { calls.push({ method: 'padPress', pad: padNote }); return true; },
        handlePadRelease: function(padNote) { calls.push({ method: 'padRelease', pad: padNote }); return true; }
    };
}

function makePage(opts) {
    opts = opts || {};
    return new PageClipLauncherHW({
        clipLauncher: opts.clipLauncher || fakeClipLauncher(),
        pager: opts.pager || fakePager(),
        launchpadModeSwitcher: opts.launchpadModeSwitcher || fakeModeSwitcher(),
        launchpad: opts.launchpad || fakeLaunchpad(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// page has correct id and pageNumber
(function() {
    var page = makePage();
    assert(page.id === "clip-launcher", "id should be clip-launcher");
    assert(page.pageNumber === 3, "pageNumber should be 3");
})();

// show() registers pad behaviors and refreshes clips
(function() {
    var cl = fakeClipLauncher();
    var page = makePage({ clipLauncher: cl });
    page.show();
    assert(cl.calls.indexOf('registerPadBehaviors') !== -1, "should register pad behaviors");
    assert(cl.calls.indexOf('refresh') !== -1, "should refresh clip states");
})();

// show() clears page state via pager
(function() {
    var pager = fakePager();
    var page = makePage({ pager: pager });
    page.show();
    assert(pager.clearAlls.length === 1, "should call requestClearAll once");
    assert(pager.clearAlls[0] === 3, "should clear page 3");
})();

// show() clears all mode button pads
(function() {
    var pager = fakePager();
    var ms = fakeModeSwitcher();
    var page = makePage({ pager: pager, launchpadModeSwitcher: ms });
    page.show();
    var clearedPads = pager.clears.map(function(c) { return c.pad; });
    assert(clearedPads.indexOf(89) !== -1, "should clear volume mode pad");
    assert(clearedPads.indexOf(79) !== -1, "should clear pan mode pad");
    assert(clearedPads.indexOf(69) !== -1, "should clear mute mode pad");
    assert(clearedPads.indexOf(59) !== -1, "should clear solo mode pad");
    assert(clearedPads.indexOf(49) !== -1, "should clear recordArm mode pad");
    // All clears should be on page 3
    pager.clears.forEach(function(c) {
        assert(c.page === 3, "mode button clears should target page 3");
    });
})();

// handlePadPress on row 8 launches correct scene
(function() {
    var cl = fakeClipLauncher();
    var page = makePage({ clipLauncher: cl });
    var result = page.handlePadPress(81); // row 8, col 1 -> scene 0
    assert(result === true, "should return true for scene launch");
    assert(cl.calls.length === 1, "should call launchScene");
    assert(cl.calls[0].method === 'launchScene', "should call launchScene");
    assert(cl.calls[0].index === 0, "scene index should be 0 for col 1");
})();

// handlePadPress on row 8, col 5 launches scene 4
(function() {
    var cl = fakeClipLauncher();
    var page = makePage({ clipLauncher: cl });
    page.handlePadPress(85); // row 8, col 5 -> scene 4
    assert(cl.calls[0].index === 4, "scene index should be 4 for col 5");
})();

// handlePadPress on rows 1-7 delegates to launchpad
(function() {
    var lp = fakeLaunchpad();
    var page = makePage({ launchpad: lp });
    var result = page.handlePadPress(34); // row 3, col 4
    assert(result === true, "should return true from launchpad delegation");
    assert(lp.calls.length === 1, "should delegate to launchpad");
    assert(lp.calls[0].method === 'padPress', "should call handlePadPress");
    assert(lp.calls[0].pad === 34, "should pass correct pad note");
})();

// handlePadPress returns false for invalid pad coordinates
(function() {
    var page = makePage();
    assert(page.handlePadPress(0) === false, "pad 0 should return false (row 0, col 0)");
    assert(page.handlePadPress(19) === false, "pad 19 should return false (col 9)");
    assert(page.handlePadPress(90) === false, "pad 90 should return false (row 9, col 0)");
})();

// handlePadRelease on rows 1-7 delegates to launchpad
(function() {
    var lp = fakeLaunchpad();
    var page = makePage({ launchpad: lp });
    var result = page.handlePadRelease(52); // row 5, col 2
    assert(result === true, "should return true from launchpad delegation");
    assert(lp.calls[0].method === 'padRelease', "should call handlePadRelease");
    assert(lp.calls[0].pad === 52, "should pass correct pad note");
})();

// handlePadRelease on row 8 returns false (scene buttons have no release behavior)
(function() {
    var lp = fakeLaunchpad();
    var page = makePage({ launchpad: lp });
    var result = page.handlePadRelease(83); // row 8
    assert(result === false, "row 8 release should return false");
    assert(lp.calls.length === 0, "should not delegate row 8 release to launchpad");
})();

// hide() does not throw (just logs in debug mode)
(function() {
    var page = makePage();
    page.hide(); // should not throw
    assert(true, "hide should not throw");
})();

// init() does not throw
(function() {
    var page = makePage();
    page.init();
    assert(true, "init should not throw");
})();

process.exit(t.summary('Page_ClipLauncher'));
