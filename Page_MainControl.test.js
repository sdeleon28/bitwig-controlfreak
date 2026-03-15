var PageMainControlHW = require('./Page_MainControl');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpadLane() {
    var calls = [];
    return {
        calls: calls,
        registerMarkerBehaviors: function() { calls.push('registerMarkerBehaviors'); },
        refresh: function() { calls.push('refresh'); }
    };
}

function fakeFavBar() {
    var calls = [];
    return {
        calls: calls,
        activate: function(page) { calls.push({ method: 'activate', page: page }); },
        deactivate: function(page) { calls.push({ method: 'deactivate', page: page }); }
    };
}

function fakeController(opts) {
    opts = opts || {};
    var calls = [];
    return {
        calls: calls,
        selectedGroup: opts.selectedGroup || null,
        _mode: opts.mode || 'grid',
        refreshGroupDisplay: function() { calls.push('refreshGroupDisplay'); },
        refreshTrackGrid: function() { calls.push('refreshTrackGrid'); },
        selectGroup: function(num) { calls.push({ method: 'selectGroup', num: num }); },
        enterMasterTrackMode: function() { calls.push('enterMasterTrackMode'); }
    };
}

function fakeLaunchpadModeSwitcher() {
    var calls = [];
    return {
        calls: calls,
        registerBehaviors: function() { calls.push('registerBehaviors'); },
        refresh: function() { calls.push('refresh'); }
    };
}

function fakeLaunchpad(opts) {
    opts = opts || {};
    var calls = [];
    return {
        calls: calls,
        handleNotePadPress: function(padNote) {
            calls.push({ method: 'notePadPress', pad: padNote });
            return opts.notePads ? opts.notePads.indexOf(padNote) !== -1 : false;
        },
        handleNotePadRelease: function(padNote) {
            calls.push({ method: 'notePadRelease', pad: padNote });
            return opts.notePads ? opts.notePads.indexOf(padNote) !== -1 : false;
        },
        handlePadPress: function(padNote) {
            calls.push({ method: 'padPress', pad: padNote });
            // Return true if pad is in the "handled" set
            return opts.handledPads ? opts.handledPads.indexOf(padNote) !== -1 : false;
        },
        handlePadRelease: function(padNote) {
            calls.push({ method: 'padRelease', pad: padNote });
            return true;
        }
    };
}

function fakeLaunchpadQuadrant(opts) {
    opts = opts || {};
    return {
        bottomRight: {
            getGroup: function(padNote) {
                // Return group number if pad is in the group map, null otherwise
                return opts.groupMap ? (opts.groupMap[padNote] || null) : null;
            }
        }
    };
}

function makePage(opts) {
    opts = opts || {};
    return new PageMainControlHW({
        launchpadLane: opts.launchpadLane || fakeLaunchpadLane(),
        controller: opts.controller || fakeController(),
        launchpadModeSwitcher: opts.launchpadModeSwitcher || fakeLaunchpadModeSwitcher(),
        launchpad: opts.launchpad || fakeLaunchpad(),
        launchpadQuadrant: opts.launchpadQuadrant || fakeLaunchpadQuadrant(),
        favBar: opts.favBar || fakeFavBar(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// page has correct id and pageNumber
(function() {
    var page = makePage();
    assert(page.id === "main-control", "id should be main-control");
    assert(page.pageNumber === 1, "pageNumber should be 1");
})();

// show() registers marker behaviors on LaunchpadLane and activates favBar
(function() {
    var lane = fakeLaunchpadLane();
    var fb = fakeFavBar();
    var page = makePage({ launchpadLane: lane, favBar: fb });
    page.show();
    assert(lane.calls.indexOf('registerMarkerBehaviors') !== -1, "should register marker behaviors");
    assert(lane.calls.indexOf('refresh') !== -1, "should refresh lane");
    var activateCall = fb.calls.find(function(c) { return c.method === 'activate'; });
    assert(activateCall !== undefined, "should activate favBar");
    assert(activateCall.page === 1, "should activate favBar on page 1");
})();

// show() refreshes controller display
(function() {
    var ctrl = fakeController();
    var page = makePage({ controller: ctrl });
    page.show();
    assert(ctrl.calls.indexOf('refreshGroupDisplay') !== -1, "should refresh group display");
    assert(ctrl.calls.indexOf('refreshTrackGrid') !== -1, "should refresh track grid");
})();

// show() registers and refreshes mode switcher
(function() {
    var ms = fakeLaunchpadModeSwitcher();
    var page = makePage({ launchpadModeSwitcher: ms });
    page.show();
    assert(ms.calls.indexOf('registerBehaviors') !== -1, "should register mode switcher behaviors");
    assert(ms.calls.indexOf('refresh') !== -1, "should refresh mode switcher");
})();

// handlePadPress: launchpad behavior takes priority
(function() {
    var lp = fakeLaunchpad({ handledPads: [34] });
    var ctrl = fakeController();
    var page = makePage({ launchpad: lp, controller: ctrl });
    var result = page.handlePadPress(34);
    assert(result === true, "should return true when launchpad handles pad");
    assert(ctrl.calls.length === 0, "should not reach controller when launchpad handles");
})();

// handlePadPress: falls through to group selector when launchpad doesn't handle
(function() {
    var lp = fakeLaunchpad({ handledPads: [] });
    var ctrl = fakeController();
    var quad = fakeLaunchpadQuadrant({ groupMap: { 45: 3 } });
    var page = makePage({ launchpad: lp, controller: ctrl, launchpadQuadrant: quad });
    var result = page.handlePadPress(45);
    assert(result === true, "should return true when group selector matches");
    assert(ctrl.calls.length === 1, "should call selectGroup");
    assert(ctrl.calls[0].method === 'selectGroup', "should call selectGroup");
    assert(ctrl.calls[0].num === 3, "should select group 3");
})();

// handlePadPress: returns false when nothing handles the pad
(function() {
    var lp = fakeLaunchpad({ handledPads: [] });
    var quad = fakeLaunchpadQuadrant({ groupMap: {} });
    var page = makePage({ launchpad: lp, launchpadQuadrant: quad });
    var result = page.handlePadPress(99);
    assert(result === false, "should return false when no handler matches");
})();

// handlePadRelease delegates to launchpad (note pad check first, then regular)
(function() {
    var lp = fakeLaunchpad();
    var page = makePage({ launchpad: lp });
    var result = page.handlePadRelease(34);
    assert(result === true, "should return true from launchpad delegation");
    var padReleaseCalls = lp.calls.filter(function(c) { return c.method === 'padRelease'; });
    assert(padReleaseCalls.length === 1, "should call handlePadRelease");
    assert(padReleaseCalls[0].pad === 34, "should pass correct pad note");
})();

// circular deps: controller and modeSwitcher can be set after construction
(function() {
    var page = new PageMainControlHW({
        launchpadLane: fakeLaunchpadLane(),
        launchpad: fakeLaunchpad(),
        launchpadQuadrant: fakeLaunchpadQuadrant(),
        debug: false, println: function() {}
    });
    assert(page.controller === null, "controller should be null initially");
    assert(page.launchpadModeSwitcher === null, "modeSwitcher should be null initially");

    var ctrl = fakeController();
    var ms = fakeLaunchpadModeSwitcher();
    page.controller = ctrl;
    page.launchpadModeSwitcher = ms;

    page.show();
    assert(ctrl.calls.indexOf('refreshGroupDisplay') !== -1, "patched controller should work in show()");
    assert(ms.calls.indexOf('registerBehaviors') !== -1, "patched modeSwitcher should work in show()");
})();

// handlePadPress: pressing pad 16 when already on group 16 in grid mode enters master track mode
(function() {
    var lp = fakeLaunchpad({ handledPads: [] });
    var ctrl = fakeController({ selectedGroup: 16, mode: 'grid' });
    var quad = fakeLaunchpadQuadrant({ groupMap: { 38: 16 } });
    var page = makePage({ launchpad: lp, controller: ctrl, launchpadQuadrant: quad });
    var result = page.handlePadPress(38);
    assert(result === true, "should return true");
    assert(ctrl.calls.indexOf('enterMasterTrackMode') !== -1, "should call enterMasterTrackMode");
    var selectCalls = ctrl.calls.filter(function(c) { return c.method === 'selectGroup'; });
    assert(selectCalls.length === 0, "should NOT call selectGroup");
})();

// handlePadPress: pressing pad 16 when NOT on group 16 calls selectGroup normally
(function() {
    var lp = fakeLaunchpad({ handledPads: [] });
    var ctrl = fakeController({ selectedGroup: 3, mode: 'grid' });
    var quad = fakeLaunchpadQuadrant({ groupMap: { 38: 16 } });
    var page = makePage({ launchpad: lp, controller: ctrl, launchpadQuadrant: quad });
    var result = page.handlePadPress(38);
    assert(result === true, "should return true");
    assert(ctrl.calls[0].method === 'selectGroup', "should call selectGroup");
    assert(ctrl.calls[0].num === 16, "should select group 16");
})();

// handlePadPress: pressing pad 16 when already on group 16 but NOT in grid mode calls selectGroup
(function() {
    var lp = fakeLaunchpad({ handledPads: [] });
    var ctrl = fakeController({ selectedGroup: 16, mode: 'track' });
    var quad = fakeLaunchpadQuadrant({ groupMap: { 38: 16 } });
    var page = makePage({ launchpad: lp, controller: ctrl, launchpadQuadrant: quad });
    var result = page.handlePadPress(38);
    assert(result === true, "should return true");
    assert(ctrl.calls[0].method === 'selectGroup', "should call selectGroup when in track mode");
    assert(ctrl.calls[0].num === 16, "should select group 16");
})();

// hide() deactivates favBar
(function() {
    var fb = fakeFavBar();
    var page = makePage({ favBar: fb });
    page.hide();
    var deactivateCall = fb.calls.find(function(c) { return c.method === 'deactivate'; });
    assert(deactivateCall !== undefined, "should deactivate favBar on hide");
})();

// init() and hide() do not throw
(function() {
    var page = makePage();
    page.init();
    page.hide();
    assert(true, "init and hide should not throw");
})();

// ---- note pad priority tests ----

// handlePadPress: note pads take priority over regular pad behaviors
(function() {
    var lp = fakeLaunchpad({ notePads: [34], handledPads: [34] });
    var ctrl = fakeController();
    var page = makePage({ launchpad: lp, controller: ctrl });
    var result = page.handlePadPress(34);
    assert(result === true, "should return true when note pad handles");
    // Should only have notePadPress call, NOT padPress
    var notePadCalls = lp.calls.filter(function(c) { return c.method === 'notePadPress'; });
    var padPressCalls = lp.calls.filter(function(c) { return c.method === 'padPress'; });
    assert(notePadCalls.length === 1, "should check note pad");
    assert(padPressCalls.length === 0, "should NOT check regular pad behavior when note pad handles");
})();

// handlePadPress: falls through to regular behavior when note pad doesn't handle
(function() {
    var lp = fakeLaunchpad({ notePads: [], handledPads: [34] });
    var page = makePage({ launchpad: lp });
    var result = page.handlePadPress(34);
    assert(result === true, "should return true from regular pad behavior");
    var notePadCalls = lp.calls.filter(function(c) { return c.method === 'notePadPress'; });
    var padPressCalls = lp.calls.filter(function(c) { return c.method === 'padPress'; });
    assert(notePadCalls.length === 1, "should check note pad first");
    assert(padPressCalls.length === 1, "should fall through to regular pad behavior");
})();

// handlePadRelease: note pads take priority
(function() {
    var lp = fakeLaunchpad({ notePads: [34] });
    var page = makePage({ launchpad: lp });
    var result = page.handlePadRelease(34);
    assert(result === true, "should return true when note pad handles release");
    var notePadReleaseCalls = lp.calls.filter(function(c) { return c.method === 'notePadRelease'; });
    var padReleaseCalls = lp.calls.filter(function(c) { return c.method === 'padRelease'; });
    assert(notePadReleaseCalls.length === 1, "should check note pad release");
    assert(padReleaseCalls.length === 0, "should NOT check regular pad release when note pad handles");
})();

// handlePadRelease: falls through to regular behavior when note pad doesn't handle
(function() {
    var lp = fakeLaunchpad({ notePads: [] });
    var page = makePage({ launchpad: lp });
    var result = page.handlePadRelease(34);
    assert(result === true, "should return true from regular pad release");
    var notePadReleaseCalls = lp.calls.filter(function(c) { return c.method === 'notePadRelease'; });
    var padReleaseCalls = lp.calls.filter(function(c) { return c.method === 'padRelease'; });
    assert(notePadReleaseCalls.length === 1, "should check note pad release first");
    assert(padReleaseCalls.length === 1, "should fall through to regular pad release");
})();

process.exit(t.summary('Page_MainControl'));
