var FavBarHW = require('./FavBar');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeTrack(name, opts) {
    opts = opts || {};
    var _name = name;
    var _armed = opts.armed || false;
    var _color = opts.color || { r: 0.5, g: 0.5, b: 0.5 };
    return {
        name: function() {
            return {
                get: function() { return _name; },
                set: function(v) { _name = v; }
            };
        },
        arm: function() {
            return {
                get: function() { return _armed; },
                set: function(v) { _armed = v; }
            };
        },
        color: function() {
            return {
                red: function() { return _color.r; },
                green: function() { return _color.g; },
                blue: function() { return _color.b; }
            };
        },
        makeVisibleInArranger: function() {}
    };
}

function fakeBitwig(tracks) {
    tracks = tracks || {};
    return {
        getTrack: function(id) { return tracks[id] || null; }
    };
}

function fakeLaunchpad() {
    var behaviors = {};
    var clearedBehaviors = [];
    var colorVariants = {
        5: { bright: 4, dim: 6 },     // red
        21: { bright: 19, dim: 23 },   // green
        17: { bright: 16, dim: 18 }    // amber
    };
    return {
        registeredBehaviors: behaviors,
        clearedBehaviors: clearedBehaviors,
        colors: { red: 5, green: 21, amber: 17, white: 3 },
        brightness: { bright: 'bright', dim: 'dim' },
        registerPadBehavior: function(pad, click, hold, page) {
            behaviors[pad] = { click: click, hold: hold, page: page };
        },
        clearPadBehavior: function(pad) { clearedBehaviors.push(pad); },
        bitwigColorToLaunchpad: function(r, g, b) {
            if (r > 0.5 && g <= 0.5 && b <= 0.5) return 72;  // red-ish
            if (r <= 0.5 && g > 0.5 && b <= 0.5) return 21; // green
            return 17; // amber
        },
        getBrightnessVariant: function(baseColor, level) {
            var variants = colorVariants[baseColor];
            if (variants && level) return variants[level] || baseColor;
            return baseColor;
        }
    };
}

function fakePager() {
    var paints = [];
    var clears = [];
    var flashings = [];
    return {
        paints: paints,
        clears: clears,
        flashings: flashings,
        requestPaint: function(page, pad, color) { paints.push({ page: page, pad: pad, color: color }); },
        requestPaintFlashing: function(page, pad, color) { flashings.push({ page: page, pad: pad, color: color }); },
        requestClear: function(page, pad) { clears.push({ page: page, pad: pad }); }
    };
}

function fakeHost() {
    var notifications = [];
    return {
        notifications: notifications,
        showPopupNotification: function(msg) { notifications.push(msg); }
    };
}

function fakeQuickActions() {
    var calls = [];
    return {
        calls: calls,
        registerBehaviors: function(p) { calls.push({ method: 'registerBehaviors', page: p }); },
        refresh: function(p) { calls.push({ method: 'refresh', page: p }); },
        clear: function(p) { calls.push({ method: 'clear', page: p }); }
    };
}

function makeFavBar(opts) {
    opts = opts || {};
    return new FavBarHW({
        launchpad: opts.launchpad || fakeLaunchpad(),
        pager: opts.pager || fakePager(),
        bitwig: opts.bitwig || fakeBitwig(),
        host: opts.host || fakeHost(),
        quickActions: opts.quickActions || fakeQuickActions(),
        onTrackSelected: opts.onTrackSelected || null,
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// defaults to fav mode OFF
(function() {
    var fb = makeFavBar();
    assert(fb.isFavMode() === false, 'default fav mode is OFF');
})();

// toggleFavMode turns ON with correct growl
(function() {
    var host = fakeHost();
    var fb = makeFavBar({ host: host });
    fb.toggleFavMode();
    assert(fb.isFavMode() === true, 'fav mode ON after toggle');
    assert(host.notifications[0] === 'fav mode ON, quick actions OFF', 'ON growl');
})();

// toggleFavMode turns OFF with correct growl
(function() {
    var host = fakeHost();
    var fb = makeFavBar({ host: host });
    fb.toggleFavMode(); // ON
    fb.toggleFavMode(); // OFF
    assert(fb.isFavMode() === false, 'fav mode OFF after double toggle');
    assert(host.notifications[1] === 'fav mode OFF, quick actions ON', 'OFF growl');
})();

// toggle ON clears quick actions
(function() {
    var qa = fakeQuickActions();
    var fb = makeFavBar({ quickActions: qa });
    fb.toggleFavMode();
    var clearCall = qa.calls.find(function(c) { return c.method === 'clear'; });
    assert(clearCall !== undefined, 'quick actions cleared when fav mode ON');
})();

// toggle OFF restores quick actions
(function() {
    var qa = fakeQuickActions();
    var fb = makeFavBar({ quickActions: qa });
    fb.toggleFavMode(); // ON
    qa.calls.length = 0;
    fb.toggleFavMode(); // OFF
    var registerCall = qa.calls.find(function(c) { return c.method === 'registerBehaviors'; });
    var refreshCall = qa.calls.find(function(c) { return c.method === 'refresh'; });
    assert(registerCall !== undefined, 'quick actions re-registered when fav mode OFF');
    assert(refreshCall !== undefined, 'quick actions refreshed when fav mode OFF');
})();

// scanFavTracks parses {n} from track names
(function() {
    var tracks = {};
    tracks[5] = fakeTrack('Vocals {1}');
    tracks[12] = fakeTrack('Bass {3}');
    tracks[30] = fakeTrack('No tag');
    tracks[42] = fakeTrack('Keys {8}');
    var bw = fakeBitwig(tracks);
    var fb = makeFavBar({ bitwig: bw });
    fb.scanFavTracks();
    assert(fb._favTracks[1] === 5, 'slot 1 → track 5');
    assert(fb._favTracks[3] === 12, 'slot 3 → track 12');
    assert(fb._favTracks[8] === 42, 'slot 8 → track 42');
    assert(fb._favTracks[2] === undefined, 'slot 2 empty');
})();

// scanFavTracks ignores slots outside 1-8
(function() {
    var tracks = {};
    tracks[0] = fakeTrack('Track {0}');
    tracks[1] = fakeTrack('Track {9}');
    tracks[2] = fakeTrack('Track {1}');
    var bw = fakeBitwig(tracks);
    var fb = makeFavBar({ bitwig: bw });
    fb.scanFavTracks();
    assert(fb._favTracks[0] === undefined, 'slot 0 ignored');
    assert(fb._favTracks[9] === undefined, 'slot 9 ignored');
    assert(fb._favTracks[1] === 2, 'slot 1 mapped');
})();

// handleTrackNameChange updates fav slot mapping
(function() {
    var tracks = {};
    tracks[10] = fakeTrack('Vocals');
    var bw = fakeBitwig(tracks);
    var fb = makeFavBar({ bitwig: bw });

    // Add {3} tag
    fb.handleTrackNameChange(10, 'Vocals {3}');
    assert(fb._favTracks[3] === 10, 'slot 3 mapped to track 10');

    // Rename to {5}
    fb.handleTrackNameChange(10, 'Vocals {5}');
    assert(fb._favTracks[3] === undefined, 'slot 3 cleared');
    assert(fb._favTracks[5] === 10, 'slot 5 mapped to track 10');

    // Remove tag
    fb.handleTrackNameChange(10, 'Vocals');
    assert(fb._favTracks[5] === undefined, 'slot 5 cleared after tag removal');
})();

// XOR arm: clicking fav pad disarms all, arms target
(function() {
    var tracks = {};
    tracks[5] = fakeTrack('Vocals {1}');
    tracks[10] = fakeTrack('Bass {2}', { armed: true });
    tracks[20] = fakeTrack('Keys');
    var bw = fakeBitwig(tracks);
    var lp = fakeLaunchpad();
    var fb = makeFavBar({ bitwig: bw, launchpad: lp });
    fb._favTracks = { 1: 5, 2: 10 };
    fb._favMode = true;

    fb.registerFavBehaviors(1);
    // Click slot 1 (pad 51)
    lp.registeredBehaviors[51].click();

    assert(tracks[5].arm().get() === true, 'target track armed');
    assert(tracks[10].arm().get() === false, 'other fav track disarmed');
})();

// clicking empty fav slot shows notification
(function() {
    var host = fakeHost();
    var lp = fakeLaunchpad();
    var fb = makeFavBar({ launchpad: lp, host: host });
    fb._favMode = true;
    fb.registerFavBehaviors(1);
    // Click slot 1 (pad 51) with no fav track assigned
    lp.registeredBehaviors[51].click();
    assert(host.notifications[0] === 'No fav track in slot 1', 'empty slot notification');
})();

// refreshFavPads shows track color for unarmed fav track
(function() {
    var tracks = {};
    tracks[5] = fakeTrack('Vocals {1}', { color: { r: 0, g: 1, b: 0 } }); // green
    var bw = fakeBitwig(tracks);
    var pager = fakePager();
    var lp = fakeLaunchpad();
    var fb = makeFavBar({ bitwig: bw, pager: pager, launchpad: lp });
    fb._favTracks = { 1: 5 };
    fb._favMode = true;

    fb.refreshFavPads(1);

    var pad51Paint = pager.paints.find(function(p) { return p.pad === 51; });
    assert(pad51Paint !== undefined, 'pad 51 painted');
    assert(pad51Paint.color === 19, 'pad 51 shows bright green (track color)');
})();

// refreshFavPads shows red for armed fav track
(function() {
    var tracks = {};
    tracks[5] = fakeTrack('Vocals {1}', { armed: true, color: { r: 0, g: 1, b: 0 } });
    var bw = fakeBitwig(tracks);
    var pager = fakePager();
    var fb = makeFavBar({ bitwig: bw, pager: pager });
    fb._favTracks = { 1: 5 };
    fb._favMode = true;

    fb.refreshFavPads(1);

    var pad51Paint = pager.paints.find(function(p) { return p.pad === 51; });
    assert(pad51Paint !== undefined, 'pad 51 painted');
    assert(pad51Paint.color === 6, 'pad 51 shows dim red (armed)');
})();

// refreshFavPads clears empty slots
(function() {
    var pager = fakePager();
    var fb = makeFavBar({ pager: pager });
    fb._favMode = true;
    fb._favTracks = {}; // no fav tracks

    fb.refreshFavPads(1);

    assert(pager.clears.length === 8, 'all 8 pads cleared for empty slots');
})();

// refreshFavPads does nothing when fav mode is OFF
(function() {
    var pager = fakePager();
    var fb = makeFavBar({ pager: pager });
    fb._favMode = false;
    fb._favTracks = { 1: 5 };

    fb.refreshFavPads(1);

    assert(pager.paints.length === 0, 'no paints when fav mode off');
    assert(pager.clears.length === 0, 'no clears when fav mode off');
})();

// activate in fav mode registers fav behaviors
(function() {
    var lp = fakeLaunchpad();
    var fb = makeFavBar({ launchpad: lp });
    fb._favMode = true;
    fb.activate(1);
    // All 8 pads should have behaviors
    assert(lp.registeredBehaviors[51] !== undefined, 'pad 51 registered in fav mode');
    assert(lp.registeredBehaviors[58] !== undefined, 'pad 58 registered in fav mode');
})();

// activate in normal mode registers quick actions
(function() {
    var qa = fakeQuickActions();
    var fb = makeFavBar({ quickActions: qa });
    fb._favMode = false;
    fb.activate(1);
    var registerCall = qa.calls.find(function(c) { return c.method === 'registerBehaviors'; });
    var refreshCall = qa.calls.find(function(c) { return c.method === 'refresh'; });
    assert(registerCall !== undefined, 'quick actions registered in normal mode');
    assert(refreshCall !== undefined, 'quick actions refreshed in normal mode');
})();

// registerFavBehaviors registers on all 8 pads
(function() {
    var lp = fakeLaunchpad();
    var fb = makeFavBar({ launchpad: lp });
    fb.registerFavBehaviors(1);
    for (var i = 0; i < 8; i++) {
        assert(lp.registeredBehaviors[fb.pads[i]] !== undefined, 'pad ' + fb.pads[i] + ' registered');
    }
})();

// onTrackArmChanged repaints the correct pad when arm state changes
(function() {
    var tracks = {};
    tracks[5] = fakeTrack('Vocals {1}', { armed: true, color: { r: 0, g: 1, b: 0 } });
    var bw = fakeBitwig(tracks);
    var pager = fakePager();
    var lp = fakeLaunchpad();
    var fb = makeFavBar({ bitwig: bw, pager: pager, launchpad: lp });
    fb._favTracks = { 1: 5 };
    fb._favMode = true;

    fb.onTrackArmChanged(5);

    var pad51Paint = pager.paints.find(function(p) { return p.pad === 51; });
    assert(pad51Paint !== undefined, 'onTrackArmChanged painted pad 51');
    assert(pad51Paint.color === 6, 'onTrackArmChanged shows dim red for armed track');
})();

// onTrackArmChanged is a no-op when fav mode is OFF
(function() {
    var pager = fakePager();
    var fb = makeFavBar({ pager: pager });
    fb._favTracks = { 1: 5 };
    fb._favMode = false;

    fb.onTrackArmChanged(5);

    assert(pager.paints.length === 0, 'no paints when fav mode off');
    assert(pager.clears.length === 0, 'no clears when fav mode off');
})();

// onTrackArmChanged is a no-op for non-fav tracks
(function() {
    var pager = fakePager();
    var fb = makeFavBar({ pager: pager });
    fb._favTracks = { 1: 5 };
    fb._favMode = true;

    fb.onTrackArmChanged(99);

    assert(pager.paints.length === 0, 'no paints for non-fav track');
    assert(pager.clears.length === 0, 'no clears for non-fav track');
})();

// _armFavTrack calls onTrackSelected with the correct trackId
(function() {
    var selectedIds = [];
    var tracks = {};
    tracks[5] = fakeTrack('Vocals {1}');
    var bw = fakeBitwig(tracks);
    var lp = fakeLaunchpad();
    var fb = makeFavBar({
        bitwig: bw,
        launchpad: lp,
        onTrackSelected: function(id) { selectedIds.push(id); }
    });
    fb._favTracks = { 1: 5 };
    fb._favMode = true;
    fb.registerFavBehaviors(1);

    lp.registeredBehaviors[51].click();

    assert(selectedIds.length === 1, 'onTrackSelected called once');
    assert(selectedIds[0] === 5, 'onTrackSelected called with trackId 5');
})();

// _armFavTrack does NOT call onTrackSelected for empty slots
(function() {
    var selectedIds = [];
    var lp = fakeLaunchpad();
    var fb = makeFavBar({
        launchpad: lp,
        onTrackSelected: function(id) { selectedIds.push(id); }
    });
    fb._favMode = true;
    fb.registerFavBehaviors(1);

    lp.registeredBehaviors[51].click();

    assert(selectedIds.length === 0, 'onTrackSelected not called for empty slot');
})();

// enterSetFavMode flashes all 8 pads white and registers behaviors
(function() {
    var pager = fakePager();
    var lp = fakeLaunchpad();
    var tracks = {};
    tracks[7] = fakeTrack('Vocals (3)');
    var bw = fakeBitwig(tracks);
    var host = fakeHost();
    var fb = makeFavBar({ pager: pager, launchpad: lp, bitwig: bw, host: host });

    fb.enterSetFavMode(7, 1);

    assert(fb.isSetFavMode() === true, 'set fav mode is ON');
    assert(pager.flashings.length === 8, 'all 8 pads flashed');
    for (var i = 0; i < 8; i++) {
        assert(pager.flashings[i].pad === fb.pads[i], 'pad ' + fb.pads[i] + ' flashed');
        assert(pager.flashings[i].color === 3, 'pad flashed white');
    }
    assert(lp.registeredBehaviors[51] !== undefined, 'pad 51 behavior registered');
    assert(lp.registeredBehaviors[58] !== undefined, 'pad 58 behavior registered');
    assert(host.notifications[0] === 'Vocals (3) → pick fav slot', 'popup shown');
})();

// _assignFavSlot renames track with {slot} suffix
(function() {
    var tracks = {};
    tracks[7] = fakeTrack('Vocals');
    var bw = fakeBitwig(tracks);
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var fb = makeFavBar({ bitwig: bw, launchpad: lp, pager: pager });
    fb._setFavMode = true;
    fb._pendingTrackId = 7;

    fb._assignFavSlot(3, 1);

    assert(tracks[7].name().get() === 'Vocals {3}', 'track renamed with {3}');
    assert(fb.isSetFavMode() === false, 'set fav mode OFF after assign');
    assert(fb.isFavMode() === true, 'fav mode ON after assign');
})();

// _assignFavSlot strips existing {M} from pending track before adding new {slot}
(function() {
    var tracks = {};
    tracks[7] = fakeTrack('Vocals {2}');
    var bw = fakeBitwig(tracks);
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var fb = makeFavBar({ bitwig: bw, launchpad: lp, pager: pager });
    fb._setFavMode = true;
    fb._pendingTrackId = 7;

    fb._assignFavSlot(5, 1);

    assert(tracks[7].name().get() === 'Vocals {5}', 'old {2} stripped, new {5} set');
})();

// _assignFavSlot strips {slot} from clashing track
(function() {
    var tracks = {};
    tracks[7] = fakeTrack('Vocals');
    tracks[12] = fakeTrack('Bass {3}');
    var bw = fakeBitwig(tracks);
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var fb = makeFavBar({ bitwig: bw, launchpad: lp, pager: pager });
    fb._setFavMode = true;
    fb._pendingTrackId = 7;

    fb._assignFavSlot(3, 1);

    assert(tracks[7].name().get() === 'Vocals {3}', 'target track gets {3}');
    assert(tracks[12].name().get() === 'Bass', 'clashing track stripped of {3}');
})();

// _assignFavSlot entering fav mode clears quick actions
(function() {
    var tracks = {};
    tracks[7] = fakeTrack('Vocals');
    var bw = fakeBitwig(tracks);
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var qa = fakeQuickActions();
    var fb = makeFavBar({ bitwig: bw, launchpad: lp, pager: pager, quickActions: qa });
    fb._setFavMode = true;
    fb._pendingTrackId = 7;

    fb._assignFavSlot(1, 1);

    var clearCall = qa.calls.find(function(c) { return c.method === 'clear'; });
    assert(clearCall !== undefined, 'quick actions cleared when entering fav mode via assign');
})();

// exitSetFavMode restores fav mode state
(function() {
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var tracks = {};
    tracks[5] = fakeTrack('Vocals {1}', { color: { r: 0, g: 1, b: 0 } });
    var bw = fakeBitwig(tracks);
    var fb = makeFavBar({ launchpad: lp, pager: pager, bitwig: bw });
    fb._favMode = true;
    fb._favTracks = { 1: 5 };
    fb._setFavMode = true;
    fb._pendingTrackId = 7;

    fb.exitSetFavMode(1);

    assert(fb.isSetFavMode() === false, 'set fav mode OFF');
    assert(fb._pendingTrackId === null, 'pending track cleared');
    // Should have re-registered fav behaviors (since _favMode is true)
    assert(lp.registeredBehaviors[51] !== undefined, 'fav behaviors restored');
})();

// exitSetFavMode restores quick actions when fav mode is OFF
(function() {
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var qa = fakeQuickActions();
    var fb = makeFavBar({ launchpad: lp, pager: pager, quickActions: qa });
    fb._favMode = false;
    fb._setFavMode = true;
    fb._pendingTrackId = 7;

    fb.exitSetFavMode(1);

    assert(fb.isSetFavMode() === false, 'set fav mode OFF');
    var registerCall = qa.calls.find(function(c) { return c.method === 'registerBehaviors'; });
    assert(registerCall !== undefined, 'quick actions restored when not in fav mode');
})();

// toggleFavMode during setFavMode cancels the gesture instead of toggling
(function() {
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var tracks = {};
    tracks[5] = fakeTrack('Vocals {1}', { color: { r: 0, g: 1, b: 0 } });
    var bw = fakeBitwig(tracks);
    var fb = makeFavBar({ launchpad: lp, pager: pager, bitwig: bw });
    fb._favMode = true;
    fb._favTracks = { 1: 5 };

    fb.enterSetFavMode(7, 1);
    assert(fb.isSetFavMode() === true, 'in set fav mode');
    assert(pager.flashings.length === 8, 'pads are flashing');

    // Press Send B (calls toggleFavMode) — should cancel, not toggle
    fb.toggleFavMode();

    assert(fb.isSetFavMode() === false, 'set fav mode canceled');
    assert(fb.isFavMode() === true, 'fav mode unchanged (still ON)');
    assert(fb._pendingTrackId === null, 'pending track cleared');
    // Should have re-registered normal fav behaviors (non-flashing)
    assert(lp.registeredBehaviors[51] !== undefined, 'fav behaviors restored');
})();

// toggleFavMode during setFavMode when favMode was OFF restores quick actions
(function() {
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var qa = fakeQuickActions();
    var tracks = {};
    tracks[7] = fakeTrack('Vocals');
    var bw = fakeBitwig(tracks);
    var fb = makeFavBar({ launchpad: lp, pager: pager, quickActions: qa, bitwig: bw });
    fb._favMode = false;

    fb.enterSetFavMode(7, 1);
    qa.calls.length = 0;
    fb.toggleFavMode();

    assert(fb.isSetFavMode() === false, 'set fav mode canceled');
    assert(fb.isFavMode() === false, 'fav mode still OFF');
    var registerCall = qa.calls.find(function(c) { return c.method === 'registerBehaviors'; });
    assert(registerCall !== undefined, 'quick actions restored after cancel');
})();

// after canceling setFavMode via Send B, re-entering fav mode shows normal pads (no flashing)
(function() {
    var lp = fakeLaunchpad();
    var pager = fakePager();
    var tracks = {};
    tracks[5] = fakeTrack('Vocals {1}', { color: { r: 0, g: 1, b: 0 } });
    tracks[7] = fakeTrack('Keys');
    var bw = fakeBitwig(tracks);
    var fb = makeFavBar({ launchpad: lp, pager: pager, bitwig: bw });
    fb._favTracks = { 1: 5 };

    // Enter set fav mode
    fb.enterSetFavMode(7, 1);
    // Cancel with Send B
    fb.toggleFavMode();
    // Clear tracking arrays
    pager.flashings.length = 0;
    pager.paints.length = 0;

    // Now toggle fav mode ON normally
    fb.toggleFavMode();

    assert(fb.isFavMode() === true, 'fav mode ON');
    assert(pager.flashings.length === 0, 'no flashing pads');
    assert(pager.paints.length > 0, 'normal static paints applied');
})();

// ---- summary ----

process.exit(t.summary('FavBar'));
