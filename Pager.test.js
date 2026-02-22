var PagerHW = require('./Pager');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    var calls = [];
    return {
        calls: calls,
        colors: { off: 0, green: 21, red: 5, white: 3 },
        setPadColor: function(pad, color) { calls.push({ method: 'setPadColor', pad: pad, color: color }); },
        setPadColorFlashing: function(pad, color) { calls.push({ method: 'setPadColorFlashing', pad: pad, color: color }); },
        setPadColorPulsing: function(pad, color) { calls.push({ method: 'setPadColorPulsing', pad: pad, color: color }); },
        clearPad: function(pad) { calls.push({ method: 'clearPad', pad: pad }); },
        clearAll: function() { calls.push({ method: 'clearAll' }); }
    };
}

function makePager(opts) {
    opts = opts || {};
    return new PagerHW({
        launchpad: opts.launchpad || fakeLaunchpad(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// requestPaint stores state and paints when page is active
(function() {
    var lp = fakeLaunchpad();
    var pager = makePager({ launchpad: lp });
    pager.requestPaint(1, 44, 21);
    var state = pager.getPageState(1);
    assert(state[44].color === 21, 'color stored in page state');
    assert(state[44].mode === 'static', 'mode stored as static');
    assert(lp.calls.length === 1, 'one hardware call made');
    assert(lp.calls[0].method === 'setPadColor', 'setPadColor called');
    assert(lp.calls[0].pad === 44, 'correct pad');
    assert(lp.calls[0].color === 21, 'correct color');
})();

// requestPaint on inactive page stores state but does not paint
(function() {
    var lp = fakeLaunchpad();
    var pager = makePager({ launchpad: lp });
    pager.requestPaint(2, 44, 21);
    var state = pager.getPageState(2);
    assert(state[44].color === 21, 'color stored for page 2');
    assert(lp.calls.length === 0, 'no hardware calls for inactive page');
})();

// requestPaintFlashing stores mode as flashing
(function() {
    var lp = fakeLaunchpad();
    var pager = makePager({ launchpad: lp });
    pager.requestPaintFlashing(1, 44, 5);
    var state = pager.getPageState(1);
    assert(state[44].mode === 'flashing', 'mode stored as flashing');
    assert(lp.calls[0].method === 'setPadColorFlashing', 'flashing method called');
})();

// requestPaintPulsing stores mode as pulsing
(function() {
    var lp = fakeLaunchpad();
    var pager = makePager({ launchpad: lp });
    pager.requestPaintPulsing(1, 44, 5);
    var state = pager.getPageState(1);
    assert(state[44].mode === 'pulsing', 'mode stored as pulsing');
    assert(lp.calls[0].method === 'setPadColorPulsing', 'pulsing method called');
})();

// switchToPage clears hardware and repaints stored state
(function() {
    var lp = fakeLaunchpad();
    var pager = makePager({ launchpad: lp });
    // Paint on page 2 (inactive)
    pager.requestPaint(2, 44, 21);
    pager.requestPaintFlashing(2, 55, 5);
    pager.requestPaintPulsing(2, 66, 3);
    assert(lp.calls.length === 0, 'no hardware calls while page 2 inactive');

    // Switch to page 2
    pager.switchToPage(2);
    assert(pager.getActivePage() === 2, 'active page is now 2');

    // Should have clearAll + 3 repaints
    var clearAllCalls = lp.calls.filter(function(c) { return c.method === 'clearAll'; });
    assert(clearAllCalls.length === 1, 'clearAll called once');

    var setPadCalls = lp.calls.filter(function(c) { return c.method === 'setPadColor' && c.pad === 44; });
    assert(setPadCalls.length === 1, 'pad 44 repainted static');

    var flashCalls = lp.calls.filter(function(c) { return c.method === 'setPadColorFlashing' && c.pad === 55; });
    assert(flashCalls.length === 1, 'pad 55 repainted flashing');

    var pulseCalls = lp.calls.filter(function(c) { return c.method === 'setPadColorPulsing' && c.pad === 66; });
    assert(pulseCalls.length === 1, 'pad 66 repainted pulsing');
})();

// switchToPage to same page is a no-op
(function() {
    var lp = fakeLaunchpad();
    var pager = makePager({ launchpad: lp });
    pager.switchToPage(1);
    assert(lp.calls.length === 0, 'switching to same page does nothing');
})();

// requestClear paints with off color
(function() {
    var lp = fakeLaunchpad();
    var pager = makePager({ launchpad: lp });
    pager.requestClear(1, 44);
    assert(lp.calls[0].color === 0, 'cleared pad uses off color (0)');
    var state = pager.getPageState(1);
    assert(state[44].color === 0, 'state stores off color');
})();

// requestClearAll clears state and hardware when active
(function() {
    var lp = fakeLaunchpad();
    var pager = makePager({ launchpad: lp });
    pager.requestPaint(1, 44, 21);
    pager.requestPaint(1, 55, 5);
    lp.calls.length = 0;

    pager.requestClearAll(1);
    var state = pager.getPageState(1);
    assert(Object.keys(state).length === 0, 'page state cleared');
    var clearCalls = lp.calls.filter(function(c) { return c.method === 'clearPad'; });
    assert(clearCalls.length === 128, '128 clearPad calls on active page');
})();

// requestClearAll on inactive page only clears state
(function() {
    var lp = fakeLaunchpad();
    var pager = makePager({ launchpad: lp });
    pager.requestPaint(2, 44, 21);
    lp.calls.length = 0;

    pager.requestClearAll(2);
    var state = pager.getPageState(2);
    assert(Object.keys(state).length === 0, 'inactive page state cleared');
    assert(lp.calls.length === 0, 'no hardware calls for inactive page clearAll');
})();

// getActivePage returns correct value
(function() {
    var pager = makePager();
    assert(pager.getActivePage() === 1, 'default active page is 1');
    pager.switchToPage(3);
    assert(pager.getActivePage() === 3, 'active page updated after switch');
})();

// isPageActive returns correct boolean
(function() {
    var pager = makePager();
    assert(pager.isPageActive(1) === true, 'page 1 is active');
    assert(pager.isPageActive(2) === false, 'page 2 is not active');
})();

// getPageState returns empty object for unknown page
(function() {
    var pager = makePager();
    var state = pager.getPageState(99);
    assert(Object.keys(state).length === 0, 'unknown page returns empty state');
})();

// init resets state
(function() {
    var pager = makePager();
    pager.requestPaint(1, 44, 21);
    pager.switchToPage(3);
    pager.init();
    assert(pager.getActivePage() === 1, 'init resets active page to 1');
    assert(Object.keys(pager.getPageState(1)).length === 0, 'init clears page states');
})();

// ---- summary ----

process.exit(t.summary('Pager'));
