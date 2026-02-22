var ProjectExplorerHW = require('./ProjectExplorer');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    var calls = [];
    return {
        calls: calls,
        colors: { off: 0, green: 21, red: 5, white: 3, purple: 49, amber: 17 },
        setPadColor: function(pad, color) { calls.push({ method: 'setPadColor', pad: pad, color: color }); },
        setPadColorFlashing: function(pad, color) { calls.push({ method: 'setPadColorFlashing', pad: pad, color: color }); },
        setPadColorPulsing: function(pad, color) { calls.push({ method: 'setPadColorPulsing', pad: pad, color: color }); },
        setTopButtonColor: function(cc, color) { calls.push({ method: 'setTopButtonColor', cc: cc, color: color }); },
        clearPad: function(pad) { calls.push({ method: 'clearPad', pad: pad }); },
        clearAll: function() { calls.push({ method: 'clearAll' }); },
        registerPadBehavior: function(pad, click, hold, page) { calls.push({ method: 'registerPadBehavior', pad: pad }); },
        resetClickTracking: function(pad) { calls.push({ method: 'resetClickTracking', pad: pad }); },
        bitwigColorToLaunchpad: function(r, g, b) {
            if (r > 0.5 && g < 0.5 && b < 0.5) return 5;   // red
            if (r < 0.5 && g > 0.5 && b < 0.5) return 21;  // green
            if (r < 0.5 && g < 0.5 && b > 0.5) return 45;  // blue
            return 17; // amber fallback
        }
    };
}

function fakePager() {
    var calls = [];
    return {
        calls: calls,
        activePage: 2,
        requestPaint: function(page, pad, color) { calls.push({ method: 'requestPaint', page: page, pad: pad, color: color }); },
        requestPaintFlashing: function(page, pad, color) { calls.push({ method: 'requestPaintFlashing', page: page, pad: pad, color: color }); },
        requestPaintPulsing: function(page, pad, color) { calls.push({ method: 'requestPaintPulsing', page: page, pad: pad, color: color }); },
        requestClear: function(page, pad) { calls.push({ method: 'requestClear', page: page, pad: pad }); },
        getActivePage: function() { return this.activePage; }
    };
}

function fakeMarker(opts) {
    return {
        exists: function() { return { get: function() { return true; } }; },
        position: function() { return { get: function() { return opts.position; } }; },
        getColor: function() {
            return {
                red: function() { return opts.r || 0; },
                green: function() { return opts.g || 0; },
                blue: function() { return opts.b || 0; }
            };
        }
    };
}

function emptyMarker() {
    return {
        exists: function() { return { get: function() { return false; } }; },
        position: function() { return { get: function() { return 0; } }; },
        getColor: function() {
            return { red: function() { return 0; }, green: function() { return 0; }, blue: function() { return 0; } };
        }
    };
}

function fakeMarkerBank(markers) {
    // Fill up to 32 with empty markers
    var items = [];
    for (var i = 0; i < 32; i++) {
        items[i] = (markers && markers[i]) || emptyMarker();
    }
    return {
        getItemAt: function(i) { return items[i]; }
    };
}

function fakeTransport() {
    var pos = { value: 0 };
    return {
        playStartPosition: function() {
            return {
                set: function(v) { pos.value = v; }
            };
        },
        jumpToPlayStartPosition: function() {},
        _pos: pos
    };
}

function fakeBitwig(opts) {
    opts = opts || {};
    return {
        getMarkerBank: function() { return opts.markerBank || null; },
        getTransport: function() { return opts.transport || fakeTransport(); },
        setTimeSelection: function(start, end) {}
    };
}

function fakeHost() {
    var notifications = [];
    return {
        notifications: notifications,
        showPopupNotification: function(msg) { notifications.push(msg); }
    };
}

function makeExplorer(opts) {
    opts = opts || {};
    return new ProjectExplorerHW({
        bitwig: opts.bitwig || fakeBitwig(),
        launchpad: opts.launchpad || fakeLaunchpad(),
        pager: opts.pager || fakePager(),
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// buildPadLayout with two markers creates correct pads
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [
        { position: 0, color: 5 },
        { position: 16, color: 21 }
    ];
    ex.barsPerPad = 1;
    ex.buildPadLayout();

    assert(ex._padLayout.length > 0, 'pad layout not empty');
    assert(ex._padLayout[0].color === 5, 'first pad has marker 1 color');
    assert(ex._padLayout[0].startBeat === 0, 'first pad starts at beat 0');
    // Pad at index 4 (beat 16) should be the second marker color
    assert(ex._padLayout[4].color === 21, 'pad at beat 16 has marker 2 color');
})();

// buildPadLayout with marker at non-bar boundary creates partial pad
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [
        { position: 0, color: 5 },
        { position: 6, color: 21 }  // 1.5 bars in
    ];
    ex.barsPerPad = 2;
    ex.buildPadLayout();

    // First pad should be partial (6 beats = 1.5 bars, not full 2)
    assert(ex._padLayout[0].bars === 1.5, 'first pad is 1.5 bars (partial)');
    assert(ex._padLayout[0].startBeat === 0, 'partial pad starts at 0');
    assert(ex._padLayout[1].color === 21, 'second pad has new marker color');
    assert(ex._padLayout[1].startBeat === 6, 'second pad starts at marker position');
})();

// buildPadLayout with empty markers
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [];
    ex.buildPadLayout();
    assert(ex._padLayout.length === 0, 'empty markers produce empty layout');
})();

// getPadIndexForBeat returns correct pad
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [{ position: 0, color: 5 }];
    ex.barsPerPad = 1;
    ex._currentPage = 0;

    assert(ex.getPadIndexForBeat(0) === 0, 'beat 0 -> pad 0');
    assert(ex.getPadIndexForBeat(4) === 1, 'beat 4 -> pad 1');
    assert(ex.getPadIndexForBeat(7) === 1, 'beat 7 -> pad 1 (within bar 2)');
    assert(ex.getPadIndexForBeat(8) === 2, 'beat 8 -> pad 2');
})();

// getPadIndexForBeat returns null for beat before first marker
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [{ position: 16, color: 5 }];
    assert(ex.getPadIndexForBeat(0) === null, 'beat before first marker is null');
})();

// getPadIndexForBeat returns null for empty markers
(function() {
    var ex = makeExplorer();
    assert(ex.getPadIndexForBeat(0) === null, 'empty markers returns null');
})();

// getPadIndexForBeat on different page returns null
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [{ position: 0, color: 5 }];
    ex.barsPerPad = 1;
    ex._currentPage = 1;  // On page 2
    // Beat 0 is pad 0 on page 0, not on page 1
    assert(ex.getPadIndexForBeat(0) === null, 'pad on different page returns null');
})();

// getBeatForPad returns correct beat
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [
        { position: 0, color: 5 },
        { position: 40, color: 21 }
    ];
    ex.barsPerPad = 1;
    ex.buildPadLayout();

    assert(ex.getBeatForPad(0) === 0, 'pad 0 starts at beat 0');
    assert(ex.getBeatForPad(1) === 4, 'pad 1 starts at beat 4');
})();

// getBeatForPad returns 0 for out-of-range pad
(function() {
    var ex = makeExplorer();
    ex._padLayout = [];
    assert(ex.getBeatForPad(99) === 0, 'out of range pad returns 0');
})();

// getColorForPad returns correct color
(function() {
    var ex = makeExplorer();
    ex._padLayout = [
        { color: 5, bars: 1, startBeat: 0 },
        { color: 21, bars: 1, startBeat: 4 }
    ];
    ex._currentPage = 0;
    assert(ex.getColorForPad(0) === 5, 'pad 0 color is 5');
    assert(ex.getColorForPad(1) === 21, 'pad 1 color is 21');
    assert(ex.getColorForPad(99) === null, 'out of range returns null');
})();

// getColorForPad accounts for page offset
(function() {
    var ex = makeExplorer();
    ex._padLayout = [];
    for (var i = 0; i < 65; i++) {
        ex._padLayout.push({ color: i, bars: 1, startBeat: i * 4 });
    }
    ex._currentPage = 1;
    assert(ex.getColorForPad(0) === 64, 'page 2 pad 0 maps to global pad 64');
})();

// decreaseResolution doubles barsPerPad up to 32
(function() {
    var mb = fakeMarkerBank([]);
    var bw = fakeBitwig({ markerBank: mb });
    var ex = makeExplorer({ bitwig: bw });
    ex.barsPerPad = 1;
    ex.decreaseResolution();
    assert(ex.barsPerPad === 2, 'resolution decreased from 1 to 2');
    ex.barsPerPad = 32;
    ex.decreaseResolution();
    assert(ex.barsPerPad === 32, 'resolution clamped at 32');
})();

// increaseResolution halves barsPerPad down to 1
(function() {
    var mb = fakeMarkerBank([]);
    var bw = fakeBitwig({ markerBank: mb });
    var ex = makeExplorer({ bitwig: bw });
    ex.barsPerPad = 4;
    ex.increaseResolution();
    assert(ex.barsPerPad === 2, 'resolution increased from 4 to 2');
    ex.barsPerPad = 1;
    ex.increaseResolution();
    assert(ex.barsPerPad === 1, 'resolution clamped at 1');
})();

// prevPage and nextPage navigate within bounds
(function() {
    // Two markers 800 beats apart -> enough pads for multiple pages at barsPerPad=1
    var markers = [];
    markers[0] = fakeMarker({ position: 0, r: 1 });
    markers[1] = fakeMarker({ position: 800, r: 0, g: 1 });
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var ex = makeExplorer({ bitwig: bw });
    ex.barsPerPad = 1;
    ex.refresh(); // builds layout, calculates _totalPages
    assert(ex._totalPages > 2, 'enough pages for navigation test');
    ex._currentPage = 0;

    ex.nextPage();
    assert(ex._currentPage === 1, 'nextPage increments');
    ex.nextPage();
    assert(ex._currentPage === 2, 'nextPage to page 3');

    ex.prevPage();
    assert(ex._currentPage === 1, 'prevPage decrements');
    ex.prevPage();
    assert(ex._currentPage === 0, 'prevPage to first page');
    ex.prevPage();
    assert(ex._currentPage === 0, 'prevPage clamped at first page');
})();

// jumpToBar sets transport position
(function() {
    var tr = fakeTransport();
    var bw = fakeBitwig({ transport: tr });
    var pager = fakePager();
    var ex = makeExplorer({ bitwig: bw, pager: pager });
    ex._sortedMarkers = [
        { position: 0, color: 5 },
        { position: 40, color: 21 }
    ];
    ex.barsPerPad = 1;
    ex.buildPadLayout();

    ex.jumpToBar(2);
    assert(tr._pos.value === 8, 'transport set to beat 8 for pad index 2');
})();

// updatePlayheadIndicator moves flashing pad and clears queued on arrival
(function() {
    var pager = fakePager();
    pager.activePage = 2;
    var ex = makeExplorer({ pager: pager });
    ex._sortedMarkers = [
        { position: 0, color: 5 },
        { position: 40, color: 21 }
    ];
    ex.barsPerPad = 1;
    ex.buildPadLayout();

    // Set queued pad at pad 2
    ex._queuedPad = 2;
    ex._playingPad = null;

    // Move playhead to pad 1
    ex.updatePlayheadIndicator(4);
    assert(ex._playingPad === 1, 'playing pad set to 1');
    var flashCalls = pager.calls.filter(function(c) { return c.method === 'requestPaintFlashing'; });
    assert(flashCalls.length > 0, 'flashing paint requested');

    // Move playhead to pad 2 (where queued pad is)
    pager.calls.length = 0;
    ex.updatePlayheadIndicator(8);
    assert(ex._playingPad === 2, 'playing pad moved to 2');
    assert(ex._queuedPad === null, 'queued pad cleared on arrival');
})();

// updatePlayheadIndicator is no-op when not on this page
(function() {
    var pager = fakePager();
    pager.activePage = 1;
    var ex = makeExplorer({ pager: pager });
    ex._sortedMarkers = [{ position: 0, color: 5 }];
    ex.updatePlayheadIndicator(4);
    assert(pager.calls.length === 0, 'no calls when on different page');
})();

// setQueuedPad sets pulsing and clears previous
(function() {
    var pager = fakePager();
    var ex = makeExplorer({ pager: pager });
    ex._sortedMarkers = [
        { position: 0, color: 5 },
        { position: 40, color: 21 }
    ];
    ex.barsPerPad = 1;
    ex.buildPadLayout();

    ex.setQueuedPad(3);
    assert(ex._queuedPad === 3, 'queued pad set to 3');
    var pulseCalls = pager.calls.filter(function(c) { return c.method === 'requestPaintPulsing'; });
    assert(pulseCalls.length > 0, 'pulsing paint requested for queued pad');

    // Set new queued pad - previous should be restored
    pager.calls.length = 0;
    ex.setQueuedPad(4);
    assert(ex._queuedPad === 4, 'queued pad updated to 4');
    var staticCalls = pager.calls.filter(function(c) { return c.method === 'requestPaint'; });
    assert(staticCalls.length > 0, 'previous queued pad restored to static');
})();

// isPadInLoopRange correctly identifies pads in loop
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [
        { position: 0, color: 5 },
        { position: 40, color: 21 }
    ];
    ex.barsPerPad = 1;
    ex.buildPadLayout();
    ex._loopStartBeat = 4;
    ex._loopDuration = 8;

    assert(ex.isPadInLoopRange(0) === false, 'pad 0 (beat 0-4) not in loop range 4-12');
    assert(ex.isPadInLoopRange(1) === true, 'pad 1 (beat 4-8) in loop range 4-12');
    assert(ex.isPadInLoopRange(2) === true, 'pad 2 (beat 8-12) in loop range 4-12');
    assert(ex.isPadInLoopRange(3) === false, 'pad 3 (beat 12-16) not in loop range 4-12');
})();

// isPadInLoopRange returns false when time select gesture is active
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [{ position: 0, color: 5 }];
    ex.barsPerPad = 1;
    ex.buildPadLayout();
    ex._loopStartBeat = 0;
    ex._loopDuration = 16;
    ex._timeSelectActive = true;
    assert(ex.isPadInLoopRange(0) === false, 'returns false during time select gesture');
})();

// isPadInLoopRange returns false when no loop
(function() {
    var ex = makeExplorer();
    ex._sortedMarkers = [{ position: 0, color: 5 }];
    ex._loopDuration = 0;
    assert(ex.isPadInLoopRange(0) === false, 'returns false when loop duration is 0');
})();

// autoResolution picks smallest fitting resolution
(function() {
    // 200 bars of content needs resolution 4 (200/4 = 50 pads, fits in 64)
    var markers = [];
    markers[0] = fakeMarker({ position: 0, r: 1 });
    markers[1] = fakeMarker({ position: 800, r: 0, g: 1 }); // 200 bars * 4 beats
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var ex = makeExplorer({ bitwig: bw });

    ex.autoResolution();
    assert(ex.barsPerPad === 4, 'auto resolution picks 4 bars/pad for 200 bars');
    assert(ex._currentPage === 0, 'page reset to 0');
})();

// autoResolution with small content picks 1
(function() {
    var markers = [];
    markers[0] = fakeMarker({ position: 0, r: 1 });
    markers[1] = fakeMarker({ position: 100, r: 0, g: 1 }); // 25 bars
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var ex = makeExplorer({ bitwig: bw });

    ex.autoResolution();
    assert(ex.barsPerPad === 1, 'auto resolution picks 1 for small content');
})();

// time selection gesture flow
(function() {
    var mb = fakeMarkerBank([
        fakeMarker({ position: 0, r: 1 }),
        fakeMarker({ position: 32, r: 0, g: 1 })
    ]);
    var bw = fakeBitwig({ markerBank: mb });
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var ex = makeExplorer({ bitwig: bw, launchpad: lp, pager: pager });
    ex.refresh();
    pager.calls.length = 0;

    // Activate time select modifier
    ex.handleTimeSelectModifierPress();
    assert(ex._timeSelectActive === true, 'time select active after modifier press');

    // First tap (pad at index 1 = note 82)
    ex.handleTimeSelectPadPress(82);
    assert(ex._timeSelectStartPad === 1, 'start pad set to index 1');
    var whitePaint = pager.calls.filter(function(c) {
        return c.method === 'requestPaint' && c.color === 3;
    });
    assert(whitePaint.length > 0, 'start pad painted white');

    // Second tap (pad at index 3 = note 84)
    pager.calls.length = 0;
    ex.handleTimeSelectPadPress(84);
    // Range pads should be painted white
    var rangePaints = pager.calls.filter(function(c) {
        return c.method === 'requestPaint' && c.color === 3;
    });
    assert(rangePaints.length >= 2, 'range pads painted white');
})();

// resetTimeSelectGesture clears state
(function() {
    var mb = fakeMarkerBank([]);
    var bw = fakeBitwig({ markerBank: mb });
    var ex = makeExplorer({ bitwig: bw });
    ex._timeSelectActive = true;
    ex._timeSelectStartPad = 5;
    ex._timeSelectOriginalColors = { 5: 21 };
    ex.resetTimeSelectGesture();
    assert(ex._timeSelectActive === false, 'time select deactivated');
    assert(ex._timeSelectStartPad === null, 'start pad cleared');
    assert(Object.keys(ex._timeSelectOriginalColors).length === 0, 'original colors cleared');
})();

// refresh paints correct colors from marker bank
(function() {
    var markers = [];
    markers[0] = fakeMarker({ position: 0, r: 1, g: 0, b: 0 });   // red = 5
    markers[1] = fakeMarker({ position: 16, r: 0, g: 1, b: 0 });  // green = 21
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var pager = fakePager();
    var ex = makeExplorer({ bitwig: bw, pager: pager });

    ex.barsPerPad = 1;
    ex.refresh();

    // Pad 0 should be red (5), pad 4 should be green (21)
    var paintCalls = pager.calls.filter(function(c) { return c.method === 'requestPaint'; });
    var pad0Paint = paintCalls.find(function(c) { return c.pad === 81; }); // index 0 -> note 81
    var pad4Paint = paintCalls.find(function(c) { return c.pad === 85; }); // index 4 -> note 85
    assert(pad0Paint && pad0Paint.color === 5, 'first marker pad painted red');
    assert(pad4Paint && pad4Paint.color === 21, 'second marker pad painted green');
})();

// static constants are accessible
(function() {
    assert(ProjectExplorerHW.PAGE_NUMBER === 2, 'static PAGE_NUMBER is 2');
    assert(ProjectExplorerHW.BEATS_PER_BAR === 4.0, 'static BEATS_PER_BAR is 4.0');
    assert(ProjectExplorerHW.PADS.length === 64, 'static PADS has 64 entries');
    assert(ProjectExplorerHW.BUTTONS.prevPage === 110, 'static BUTTONS.prevPage is 110');
    assert(ProjectExplorerHW.MODIFIERS.timeSelect === 19, 'static MODIFIERS.timeSelect is 19');
})();

// ---- summary ----

process.exit(t.summary('ProjectExplorer'));
