var LaunchpadLaneHW = require('./LaunchpadLane');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeMarker(opts) {
    opts = opts || {};
    return {
        exists: function() { return { get: function() { return opts.exists !== false; } }; },
        position: function() { return { get: function() { return opts.position || 0; } }; },
        getColor: function() {
            return {
                red: function() { return opts.r || 0; },
                green: function() { return opts.g || 0; },
                blue: function() { return opts.b || 0; }
            };
        },
        launch: function() { opts.launched = true; }
    };
}

function fakeMarkerBank(markers) {
    return {
        getItemAt: function(i) { return markers[i] || null; }
    };
}

function fakeBitwig(opts) {
    opts = opts || {};
    return {
        getMarkerBank: function() { return opts.markerBank || null; },
        invokeAction: function(action) { (opts.actions = opts.actions || []).push(action); },
        _application: { copy: function() {}, paste: function() {} }
    };
}

function fakeLaunchpad() {
    var behaviors = {};
    return {
        colors: { off: 0, green: 21, red: 5, amber: 17, yellow: 13, blue: 45, cyan: 41, purple: 49, white: 3 },
        registeredBehaviors: behaviors,
        registerPadBehavior: function(pad, click, hold, page) {
            behaviors[pad] = { click: click, hold: hold, page: page };
        },
        bitwigColorToLaunchpad: function(r, g, b) {
            if (r > 0.5 && g <= 0.5 && b <= 0.5) return 5;  // red
            if (r <= 0.5 && g > 0.5 && b <= 0.5) return 21; // green
            if (r <= 0.5 && g <= 0.5 && b > 0.5) return 45; // blue
            return 17; // amber
        }
    };
}

function fakePager() {
    var paints = [];
    var clears = [];
    var pulsings = [];
    var flashings = [];
    return {
        paints: paints,
        clears: clears,
        pulsings: pulsings,
        flashings: flashings,
        activePage: 1,
        requestPaint: function(page, pad, color) { paints.push({ page: page, pad: pad, color: color }); },
        requestClear: function(page, pad) { clears.push({ page: page, pad: pad }); },
        requestPaintPulsing: function(page, pad, color) { pulsings.push({ page: page, pad: pad, color: color }); },
        requestPaintFlashing: function(page, pad, color) { flashings.push({ page: page, pad: pad, color: color }); },
        getActivePage: function() { return this.activePage; }
    };
}

function fakeController() {
    var calls = [];
    return {
        calls: calls,
        prepareRecordingAtRegion: function(start, end) { calls.push({ start: start, end: end }); }
    };
}

function fakeHost() {
    var notifications = [];
    return {
        notifications: notifications,
        showPopupNotification: function(msg) { notifications.push(msg); }
    };
}

function makeLane(opts) {
    opts = opts || {};
    return new LaunchpadLaneHW({
        bitwig: opts.bitwig || fakeBitwig(),
        bitwigActions: opts.bitwigActions || {},
        launchpad: opts.launchpad || fakeLaunchpad(),
        pager: opts.pager || fakePager(),
        controller: opts.controller || fakeController(),
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// topLane.getMarkerIndex maps pad notes correctly (rows 6-8, 24 pads)
(function() {
    var lane = makeLane();
    assert(lane.topLane.getMarkerIndex(81) === 0, 'pad 81 -> marker 0');
    assert(lane.topLane.getMarkerIndex(88) === 7, 'pad 88 -> marker 7');
    assert(lane.topLane.getMarkerIndex(71) === 8, 'pad 71 -> marker 8');
    assert(lane.topLane.getMarkerIndex(68) === 23, 'pad 68 -> marker 23');
    assert(lane.topLane.getMarkerIndex(51) === null, 'pad 51 not in lane (row 5 removed)');
})();

// topLane.getMarkerIndex returns null for unknown pad
(function() {
    var lane = makeLane();
    assert(lane.topLane.getMarkerIndex(99) === null, 'unknown pad returns null');
    assert(lane.topLane.getMarkerIndex(0) === null, 'pad 0 returns null');
})();

// refresh paints existing markers with correct colors via pager
(function() {
    var markers = {};
    markers[0] = fakeMarker({ exists: true, r: 1, g: 0, b: 0, position: 0 });
    markers[1] = fakeMarker({ exists: true, r: 0, g: 1, b: 0, position: 4 });
    markers[2] = fakeMarker({ exists: false });
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var pager = fakePager();
    var lane = makeLane({ bitwig: bw, pager: pager });

    lane.refresh(1);

    // Should have painted marker 0 and 1
    var markerPaints = pager.paints.filter(function(p) { return p.pad === 81 || p.pad === 82; });
    assert(markerPaints.length >= 2, 'at least 2 marker pads painted');
})();

// refresh paints all 24 marker pads (no action pad skipping)
(function() {
    var markers = {};
    for (var i = 0; i < 24; i++) {
        markers[i] = fakeMarker({ exists: true, r: 1, g: 0, b: 0, position: i * 4 });
    }
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var pager = fakePager();
    var lane = makeLane({ bitwig: bw, pager: pager });

    lane.refresh(1);

    // All 24 pads should be painted with marker colors (24 clears + 24 paints)
    var markerPaints = pager.paints.filter(function(p) { return p.color === 5; }); // red=5
    assert(markerPaints.length === 24, 'all 24 marker pads painted');
})();

// registerMarkerBehaviors registers for all 24 pads in rows 6-8
(function() {
    var markers = {};
    for (var i = 0; i < 24; i++) {
        markers[i] = fakeMarker({ exists: true, position: i * 4 });
    }
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var lp = fakeLaunchpad();
    var lane = makeLane({ bitwig: bw, launchpad: lp });

    lane.registerMarkerBehaviors();

    // All pads in rows 6-8 should have behaviors
    assert(lp.registeredBehaviors[81] !== undefined, 'pad 81 (marker 0) registered');
    assert(lp.registeredBehaviors[71] !== undefined, 'pad 71 (marker 8) registered');
    assert(lp.registeredBehaviors[68] !== undefined, 'pad 68 (marker 23) registered');
    // Row 5 pads should NOT be registered (managed by FavBar now)
    assert(lp.registeredBehaviors[51] === undefined, 'pad 51 not registered (row 5)');
    assert(lp.registeredBehaviors[55] === undefined, 'pad 55 not registered (row 5)');
})();

// marker click callback launches marker and queues pad
(function() {
    var launched = false;
    var m0 = {
        exists: function() { return { get: function() { return true; } }; },
        launch: function() { launched = true; },
        position: function() { return { get: function() { return 0; } }; },
        getColor: function() { return { red: function() { return 0; }, green: function() { return 0; }, blue: function() { return 0; } }; }
    };
    var mb = fakeMarkerBank({ 0: m0 });
    var bw = fakeBitwig({ markerBank: mb });
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var lane = makeLane({ bitwig: bw, launchpad: lp, pager: pager });

    lane.registerMarkerBehaviors();
    // Simulate clicking pad 81 (marker 0)
    lp.registeredBehaviors[81].click();
    assert(launched === true, 'marker 0 launched');
    assert(lane._queuedPad === 0, 'pad index 0 queued');
})();

// marker hold callback calls controller.prepareRecordingAtRegion
(function() {
    var m0 = fakeMarker({ exists: true, position: 0 });
    var mb = fakeMarkerBank({ 0: m0 });
    var bw = fakeBitwig({ markerBank: mb });
    var lp = fakeLaunchpad();
    var ctrl = fakeController();
    var lane = makeLane({ bitwig: bw, launchpad: lp, controller: ctrl });

    lane.registerMarkerBehaviors();
    lp.registeredBehaviors[81].hold();
    assert(ctrl.calls.length === 1, 'prepareRecordingAtRegion called');
    assert(ctrl.calls[0].start === 0 && ctrl.calls[0].end === 0, 'called with marker 0');
})();

// getPadIndexForBeat finds correct marker range
(function() {
    var markers = {};
    markers[0] = fakeMarker({ exists: true, position: 0 });
    markers[1] = fakeMarker({ exists: true, position: 16 });
    markers[2] = fakeMarker({ exists: true, position: 32 });
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var lane = makeLane({ bitwig: bw });

    assert(lane.getPadIndexForBeat(0) === 0, 'beat 0 -> marker 0');
    assert(lane.getPadIndexForBeat(8) === 0, 'beat 8 -> marker 0 (within range)');
    assert(lane.getPadIndexForBeat(16) === 1, 'beat 16 -> marker 1');
    assert(lane.getPadIndexForBeat(32) === 2, 'beat 32 -> marker 2');
})();

// getPadIndexForBeat returns null for empty marker bank
(function() {
    var mb = fakeMarkerBank({});
    var bw = fakeBitwig({ markerBank: mb });
    var lane = makeLane({ bitwig: bw });
    assert(lane.getPadIndexForBeat(0) === null, 'empty bank returns null');
})();

// updatePlayheadIndicator sets flashing for current marker pad
(function() {
    var markers = {};
    markers[0] = fakeMarker({ exists: true, position: 0, r: 1, g: 0, b: 0 });
    markers[1] = fakeMarker({ exists: true, position: 16, r: 0, g: 1, b: 0 });
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var pager = fakePager();
    pager.activePage = 1;
    var lane = makeLane({ bitwig: bw, pager: pager });

    lane.updatePlayheadIndicator(0);
    assert(pager.flashings.length > 0, 'flashing paint requested');
    assert(pager.flashings[0].pad === 81, 'pad 81 (marker 0) set to flashing');
})();

// updatePlayheadIndicator restores previous pad to static
(function() {
    var markers = {};
    markers[0] = fakeMarker({ exists: true, position: 0, r: 1, g: 0, b: 0 });
    markers[1] = fakeMarker({ exists: true, position: 16, r: 0, g: 1, b: 0 });
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var pager = fakePager();
    pager.activePage = 1;
    var lane = makeLane({ bitwig: bw, pager: pager });

    lane.updatePlayheadIndicator(0);  // sets marker 0 flashing
    pager.paints.length = 0;
    lane.updatePlayheadIndicator(16); // moves to marker 1

    // Previous pad (marker 0) should be restored to static
    var staticPaint = pager.paints.find(function(p) { return p.pad === 81; });
    assert(staticPaint !== undefined, 'previous pad restored to static');
})();

// setQueuedPad sets pulsing effect
(function() {
    var markers = {};
    markers[5] = fakeMarker({ exists: true, position: 20, r: 1, g: 0, b: 0 });
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var pager = fakePager();
    var lane = makeLane({ bitwig: bw, pager: pager });

    lane.setQueuedPad(5);
    assert(pager.pulsings.length > 0, 'pulsing paint requested');
    assert(lane._queuedPad === 5, 'queued pad set to 5');
})();

// setQueuedPad clears previous queued pad
(function() {
    var markers = {};
    markers[3] = fakeMarker({ exists: true, position: 12, r: 1, g: 0, b: 0 });
    markers[5] = fakeMarker({ exists: true, position: 20, r: 0, g: 1, b: 0 });
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var pager = fakePager();
    var lane = makeLane({ bitwig: bw, pager: pager });

    lane.setQueuedPad(3);
    pager.paints.length = 0;
    lane.setQueuedPad(5);

    // Previous queued pad (3) should be repainted to static
    var staticPaint = pager.paints.find(function(p) { return p.pad === lane.topLane.pads[3]; });
    assert(staticPaint !== undefined, 'previous queued pad restored to static');
    assert(lane._queuedPad === 5, 'queued pad updated to 5');
})();

// playhead arriving at queued pad clears queued state
(function() {
    var markers = {};
    markers[0] = fakeMarker({ exists: true, position: 0, r: 1, g: 0, b: 0 });
    markers[5] = fakeMarker({ exists: true, position: 20, r: 0, g: 1, b: 0 });
    var mb = fakeMarkerBank(markers);
    var bw = fakeBitwig({ markerBank: mb });
    var pager = fakePager();
    pager.activePage = 1;
    var lane = makeLane({ bitwig: bw, pager: pager });

    lane.updatePlayheadIndicator(0);  // playing at marker 0
    lane.setQueuedPad(5);             // queue marker 5
    assert(lane._queuedPad === 5, 'marker 5 queued');

    lane.updatePlayheadIndicator(20); // playhead arrives at marker 5
    assert(lane._queuedPad === null, 'queued state cleared when playhead arrives');
})();

// ---- summary ----

process.exit(t.summary('LaunchpadLane'));
