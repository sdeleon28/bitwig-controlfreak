var QuickActionsHW = require('./QuickActions');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    var behaviors = {};
    return {
        registeredBehaviors: behaviors,
        registerPadBehavior: function(pad, click, hold, page) {
            behaviors[pad] = { click: click, hold: hold, page: page };
        }
    };
}

function fakePager() {
    var paints = [];
    var clears = [];
    return {
        paints: paints,
        clears: clears,
        requestPaint: function(page, pad, color) { paints.push({ page: page, pad: pad, color: color }); },
        requestClear: function(page, pad) { clears.push({ page: page, pad: pad }); }
    };
}

function fakeBitwig() {
    var actions = [];
    return {
        actions: actions,
        invokeAction: function(action) { actions.push(action); },
        _application: {
            copy: function() { actions.push('copy'); },
            paste: function() { actions.push('paste'); }
        }
    };
}

function fakeHost() {
    var notifications = [];
    return {
        notifications: notifications,
        showPopupNotification: function(msg) { notifications.push(msg); }
    };
}

function makeQuickActions(opts) {
    opts = opts || {};
    return new QuickActionsHW({
        launchpad: opts.launchpad || fakeLaunchpad(),
        pager: opts.pager || fakePager(),
        bitwig: opts.bitwig || fakeBitwig(),
        bitwigActions: opts.bitwigActions || { TOGGLE_OBJECT_TIME_SELECTION: 'toggle', INSERT_SILENCE: 'silence', REMOVE_TIME: 'remove', CUT_TIME: 'cut', INSERT_CUE_MARKER: 'marker' },
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// registerBehaviors registers on correct pads (55-58)
(function() {
    var lp = fakeLaunchpad();
    var qa = makeQuickActions({ launchpad: lp });
    qa.registerBehaviors(1);
    assert(lp.registeredBehaviors[55] !== undefined, 'pad 55 registered');
    assert(lp.registeredBehaviors[56] !== undefined, 'pad 56 registered');
    assert(lp.registeredBehaviors[57] !== undefined, 'pad 57 registered');
    assert(lp.registeredBehaviors[58] !== undefined, 'pad 58 registered');
})();

// refresh paints correct colors
(function() {
    var pager = fakePager();
    var qa = makeQuickActions({ pager: pager });
    qa.refresh(1);
    assert(pager.paints.length === 4, 'exactly 4 pads painted');
    assert(pager.paints[0].pad === 55 && pager.paints[0].color === 53, 'pad 55: toggleMode (53)');
    assert(pager.paints[1].pad === 56 && pager.paints[1].color === 49, 'pad 56: insertSilence (49)');
    assert(pager.paints[2].pad === 57 && pager.paints[2].color === 37, 'pad 57: copy (37)');
    assert(pager.paints[3].pad === 58 && pager.paints[3].color === 21, 'pad 58: paste (21)');
})();

// clear clears all quick action pads
(function() {
    var pager = fakePager();
    var qa = makeQuickActions({ pager: pager });
    qa.clear(1);
    assert(pager.clears.length === 4, '4 pads cleared');
    var clearedPads = pager.clears.map(function(c) { return c.pad; });
    assert(clearedPads.indexOf(55) !== -1, 'pad 55 cleared');
    assert(clearedPads.indexOf(56) !== -1, 'pad 56 cleared');
    assert(clearedPads.indexOf(57) !== -1, 'pad 57 cleared');
    assert(clearedPads.indexOf(58) !== -1, 'pad 58 cleared');
})();

// click pad 55 invokes toggle obj/time action
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var host = fakeHost();
    var qa = makeQuickActions({ launchpad: lp, bitwig: bw, host: host });
    qa.registerBehaviors(1);
    lp.registeredBehaviors[55].click();
    assert(bw.actions.indexOf('toggle') !== -1, 'toggle action invoked');
    assert(host.notifications[0] === 'Toggle Obj/Time Mode', 'growl shown');
})();

// click pad 56 invokes insert silence, hold invokes remove time
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var host = fakeHost();
    var qa = makeQuickActions({ launchpad: lp, bitwig: bw, host: host });
    qa.registerBehaviors(1);
    lp.registeredBehaviors[56].click();
    assert(bw.actions.indexOf('silence') !== -1, 'insert silence invoked');
    lp.registeredBehaviors[56].hold();
    assert(bw.actions.indexOf('remove') !== -1, 'remove time invoked');
})();

// click pad 57 invokes copy, hold invokes cut time
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var host = fakeHost();
    var qa = makeQuickActions({ launchpad: lp, bitwig: bw, host: host });
    qa.registerBehaviors(1);
    lp.registeredBehaviors[57].click();
    assert(bw.actions.indexOf('copy') !== -1, 'copy invoked');
    lp.registeredBehaviors[57].hold();
    assert(bw.actions.indexOf('cut') !== -1, 'cut time invoked');
})();

// click pad 58 invokes paste + insert marker
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var host = fakeHost();
    var qa = makeQuickActions({ launchpad: lp, bitwig: bw, host: host });
    qa.registerBehaviors(1);
    lp.registeredBehaviors[58].click();
    assert(bw.actions.indexOf('paste') !== -1, 'paste invoked');
    assert(bw.actions.indexOf('marker') !== -1, 'insert marker invoked');
})();

// pad 55 and 58 have no hold behavior
(function() {
    var lp = fakeLaunchpad();
    var qa = makeQuickActions({ launchpad: lp });
    qa.registerBehaviors(1);
    assert(lp.registeredBehaviors[55].hold === null, 'pad 55 no hold');
    assert(lp.registeredBehaviors[58].hold === null, 'pad 58 no hold');
})();

// ---- summary ----

process.exit(t.summary('QuickActions'));
