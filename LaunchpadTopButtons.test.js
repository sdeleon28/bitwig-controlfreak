var LaunchpadTopButtonsHW = require('./LaunchpadTopButtons');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    var topColors = {};
    return {
        colors: { off: 0, green: 21, red: 5, amber: 17, yellow: 13, blue: 45, cyan: 41, purple: 49, pink: 53, white: 3 },
        buttons: { top1: 104, top2: 105, top3: 106, top4: 107, top5: 108, top6: 109, top7: 110, top8: 111 },
        topButtonColors: topColors,
        setTopButtonColor: function(cc, color) { topColors[cc] = color; }
    };
}

function fakePages() {
    var calls = [];
    return {
        calls: calls,
        previousPage: function() { calls.push('previousPage'); },
        nextPage: function() { calls.push('nextPage'); }
    };
}

function fakePager(activePage) {
    return {
        activePage: activePage || 1,
        getActivePage: function() { return this.activePage; }
    };
}

function fakeBitwig() {
    var calls = [];
    return {
        calls: calls,
        movePlayheadByBars: function(bars) { calls.push({ method: 'movePlayheadByBars', bars: bars }); },
        invokeAction: function(action) { calls.push({ method: 'invokeAction', action: action }); }
    };
}

function fakeMainControl() {
    return { pageNumber: 1 };
}

function fakeBitwigActions() {
    return { TOGGLE_MIXER: 'toggle_mixer' };
}

function fakeClipGestures() {
    var calls = [];
    return {
        calls: calls,
        handleModifierPress: function(cc) {
            calls.push({ method: 'modifierPress', cc: cc });
            return cc === 109; // only top6 is registered as modifier
        },
        handleModifierRelease: function(cc) {
            calls.push({ method: 'modifierRelease', cc: cc });
            return cc === 109;
        }
    };
}

function fakeClipLauncher() {
    return { pageNumber: 3 };
}

function fakeProjectExplorer() {
    var calls = [];
    return {
        calls: calls,
        pageNumber: 2,
        buttons: { prevPage: 110, nextPage: 111 },
        decreaseResolution: function() { calls.push('decreaseResolution'); },
        increaseResolution: function() { calls.push('increaseResolution'); },
        prevPage: function() { calls.push('prevPage'); },
        nextPage: function() { calls.push('nextPage'); }
    };
}

function makeTopButtons(opts) {
    opts = opts || {};
    return new LaunchpadTopButtonsHW({
        launchpad: opts.launchpad || fakeLaunchpad(),
        pager: opts.pager || fakePager(),
        pages: opts.pages || fakePages(),
        bitwig: opts.bitwig || fakeBitwig(),
        clipGestures: opts.clipGestures || fakeClipGestures(),
        clipLauncher: opts.clipLauncher || fakeClipLauncher(),
        projectExplorer: opts.projectExplorer || fakeProjectExplorer(),
        mainControl: opts.mainControl || fakeMainControl(),
        bitwigActions: opts.bitwigActions || fakeBitwigActions(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// init sets bar navigation button colors to pink
(function() {
    var lp = fakeLaunchpad();
    var tb = makeTopButtons({ launchpad: lp });
    tb.init();
    assert(lp.topButtonColors[106] === 53, 'bar back (top3=106) set to pink (53)');
    assert(lp.topButtonColors[107] === 53, 'bar forward (top4=107) set to pink (53)');
})();

// init sets resolution button colors to cyan
(function() {
    var lp = fakeLaunchpad();
    var tb = makeTopButtons({ launchpad: lp });
    tb.init();
    assert(lp.topButtonColors[108] === 41, 'decrease resolution (top5=108) set to cyan (41)');
    assert(lp.topButtonColors[109] === 41, 'increase resolution (top6=109) set to cyan (41)');
})();

// page navigation: previousPage
(function() {
    var pages = fakePages();
    var tb = makeTopButtons({ pages: pages });
    var result = tb.handleTopButtonCC(104, 127);
    assert(result === true, 'previousPage returns true');
    assert(pages.calls[0] === 'previousPage', 'previousPage called');
})();

// page navigation: nextPage
(function() {
    var pages = fakePages();
    var tb = makeTopButtons({ pages: pages });
    var result = tb.handleTopButtonCC(105, 127);
    assert(result === true, 'nextPage returns true');
    assert(pages.calls[0] === 'nextPage', 'nextPage called');
})();

// bar navigation: back moves playhead -1
(function() {
    var bw = fakeBitwig();
    var tb = makeTopButtons({ bitwig: bw });
    var result = tb.handleTopButtonCC(106, 127);
    assert(result === true, 'bar back returns true');
    assert(bw.calls[0].bars === -1, 'movePlayheadByBars(-1) called');
})();

// bar navigation: forward moves playhead +1
(function() {
    var bw = fakeBitwig();
    var tb = makeTopButtons({ bitwig: bw });
    var result = tb.handleTopButtonCC(107, 127);
    assert(result === true, 'bar forward returns true');
    assert(bw.calls[0].bars === 1, 'movePlayheadByBars(1) called');
})();

// button release (value=0) is not handled (returns false)
(function() {
    var tb = makeTopButtons();
    var result = tb.handleTopButtonCC(106, 0);
    assert(result === false, 'release returns false');
})();

// unknown CC is not handled
(function() {
    var tb = makeTopButtons();
    var result = tb.handleTopButtonCC(99, 127);
    assert(result === false, 'unknown CC returns false');
})();

// clip launcher page: modifier press is delegated to clipGestures
(function() {
    var cg = fakeClipGestures();
    var pager = fakePager(3); // clip launcher page
    var tb = makeTopButtons({ clipGestures: cg, pager: pager });
    var result = tb.handleTopButtonCC(109, 127); // top6 = duplicate modifier
    assert(result === true, 'modifier press handled');
    assert(cg.calls[0].method === 'modifierPress', 'clipGestures.handleModifierPress called');
})();

// clip launcher page: modifier release is delegated to clipGestures
(function() {
    var cg = fakeClipGestures();
    var pager = fakePager(3);
    var tb = makeTopButtons({ clipGestures: cg, pager: pager });
    var result = tb.handleTopButtonCC(109, 0); // release
    assert(result === true, 'modifier release handled');
    assert(cg.calls[0].method === 'modifierRelease', 'clipGestures.handleModifierRelease called');
})();

// non-clip-launcher page: modifier CC falls through to normal handling
(function() {
    var cg = fakeClipGestures();
    var pager = fakePager(1); // not clip launcher
    var tb = makeTopButtons({ clipGestures: cg, pager: pager });
    // CC 109 = top6 = increaseResolution, but we're not on project explorer either
    var result = tb.handleTopButtonCC(109, 127);
    assert(cg.calls.length === 0, 'clipGestures not called on non-clip page');
    // CC 109 not handled by any page-independent handler
    assert(result === false, 'falls through to false');
})();

// project explorer page: decrease resolution
(function() {
    var pe = fakeProjectExplorer();
    var pager = fakePager(2); // project explorer page
    var tb = makeTopButtons({ projectExplorer: pe, pager: pager });
    var result = tb.handleTopButtonCC(108, 127);
    assert(result === true, 'decrease resolution handled');
    assert(pe.calls[0] === 'decreaseResolution', 'decreaseResolution called');
})();

// project explorer page: increase resolution
(function() {
    var pe = fakeProjectExplorer();
    var pager = fakePager(2);
    var tb = makeTopButtons({ projectExplorer: pe, pager: pager });
    var result = tb.handleTopButtonCC(109, 127);
    assert(result === true, 'increase resolution handled');
    assert(pe.calls[0] === 'increaseResolution', 'increaseResolution called');
})();

// project explorer page: pagination prev
(function() {
    var pe = fakeProjectExplorer();
    var pager = fakePager(2);
    var tb = makeTopButtons({ projectExplorer: pe, pager: pager });
    var result = tb.handleTopButtonCC(110, 127);
    assert(result === true, 'prev page handled');
    assert(pe.calls[0] === 'prevPage', 'prevPage called');
})();

// project explorer page: pagination next
(function() {
    var pe = fakeProjectExplorer();
    var pager = fakePager(2);
    var tb = makeTopButtons({ projectExplorer: pe, pager: pager });
    var result = tb.handleTopButtonCC(111, 127);
    assert(result === true, 'next page handled');
    assert(pe.calls[0] === 'nextPage', 'nextPage called');
})();

// resolution buttons not handled on non-project-explorer page
(function() {
    var pe = fakeProjectExplorer();
    var pager = fakePager(1); // main control page
    var tb = makeTopButtons({ projectExplorer: pe, pager: pager });
    var result = tb.handleTopButtonCC(108, 127);
    assert(result === false, 'resolution CC not handled on page 1');
    assert(pe.calls.length === 0, 'projectExplorer not called');
})();

// buttons mapping uses launchpad button constants
(function() {
    var tb = makeTopButtons();
    assert(tb.buttons.previousPage === 104, 'previousPage = top1 = 104');
    assert(tb.buttons.nextPage === 105, 'nextPage = top2 = 105');
    assert(tb.buttons.barBack === 106, 'barBack = top3 = 106');
    assert(tb.buttons.barForward === 107, 'barForward = top4 = 107');
    assert(tb.buttons.decreaseResolution === 108, 'decreaseResolution = top5 = 108');
    assert(tb.buttons.increaseResolution === 109, 'increaseResolution = top6 = 109');
})();

// init sets mixer toggle button (top8=111) color to white
(function() {
    var lp = fakeLaunchpad();
    var tb = makeTopButtons({ launchpad: lp });
    tb.init();
    assert(lp.topButtonColors[111] === 3, 'mixer toggle (top8=111) set to white (3)');
})();

// mixer toggle (CC 111) on main control page calls invokeAction
(function() {
    var bw = fakeBitwig();
    var pager = fakePager(1); // main control page
    var tb = makeTopButtons({ bitwig: bw, pager: pager });
    var result = tb.handleTopButtonCC(111, 127);
    assert(result === true, 'mixer toggle returns true on main control page');
    assert(bw.calls[0].method === 'invokeAction', 'invokeAction called');
    assert(bw.calls[0].action === 'toggle_mixer', 'toggle_mixer action passed');
})();

// mixer toggle (CC 111) on non-main-control page is not handled
(function() {
    var bw = fakeBitwig();
    var pager = fakePager(4); // some other page (not main control, not project explorer)
    var tb = makeTopButtons({
        bitwig: bw,
        pager: pager,
        projectExplorer: fakeProjectExplorer() // page 2, won't match
    });
    var result = tb.handleTopButtonCC(111, 127);
    assert(result === false, 'mixer toggle not handled on non-main-control page');
    assert(bw.calls.length === 0, 'invokeAction not called');
})();

// ---- summary ----

process.exit(t.summary('LaunchpadTopButtons'));
