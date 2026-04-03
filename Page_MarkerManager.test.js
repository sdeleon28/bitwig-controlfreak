var PageMarkerManagerHW = require('./Page_MarkerManager');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakePager() {
    var paints = [];
    return {
        paints: paints,
        requestPaint: function(page, pad, color) { paints.push({ page: page, pad: pad, color: color }); }
    };
}

function fakeLaunchpad() {
    var calls = [];
    return {
        calls: calls,
        registerPadBehavior: function(note, click, hold, page) {
            calls.push({ method: 'registerPadBehavior', note: note, click: click, hold: hold, page: page });
        },
        handlePadPress: function(padNote) {
            calls.push({ method: 'padPress', pad: padNote });
            return true;
        },
        handlePadRelease: function(padNote) {
            calls.push({ method: 'padRelease', pad: padNote });
            return true;
        },
        setTopButtonColor: function(btn, color) {
            calls.push({ method: 'setTopButtonColor', btn: btn, color: color });
        }
    };
}

function fakeProjectExplorer(opts) {
    opts = opts || {};
    var calls = [];
    return {
        calls: calls,
        buttons: { prevPage: 91, nextPage: 92 },
        modifiers: { timeSelect: 49, copySelect: 59 },
        pads: [11, 12, 13, 14, 15, 16, 17, 18, 21, 22],
        _timeSelectActive: opts.timeSelectActive || false,
        _copySelectActive: opts.copySelectActive || false,
        registerBehaviors: function() { calls.push('registerBehaviors'); },
        autoResolution: function() { calls.push('autoResolution'); },
        refresh: function() { calls.push('refresh'); },
        handleTimeSelectModifierPress: function() { calls.push('timeSelectModifierPress'); },
        handleTimeSelectModifierRelease: function() { calls.push('timeSelectModifierRelease'); },
        handleCopySelectModifierPress: function() { calls.push('copySelectModifierPress'); },
        handleCopySelectModifierRelease: function() { calls.push('copySelectModifierRelease'); },
        handleTimeSelectPadPress: function(pad) { calls.push({ method: 'timeSelectPadPress', pad: pad }); },
        handleCopySelectPadPress: function(pad) { calls.push({ method: 'copySelectPadPress', pad: pad }); }
    };
}

function fakeBitwig() {
    var calls = [];
    return {
        calls: calls,
        invokeAction: function(action) { calls.push({ method: 'invokeAction', action: action }); },
        _application: {
            copy: function() { calls.push({ method: 'copy' }); },
            paste: function() { calls.push({ method: 'paste' }); }
        }
    };
}

function fakeBitwigActions() {
    return {
        TOGGLE_OBJECT_TIME_SELECTION: 'toggle_obj_time',
        INSERT_SILENCE: 'insert_silence',
        REMOVE_TIME: 'remove_time',
        CUT_TIME: 'cut_time',
        INSERT_CUE_MARKER: 'insert_cue_marker',
        STOP: 'stop_transport'
    };
}

function fakeHost() {
    var popups = [];
    return {
        popups: popups,
        showPopupNotification: function(msg) { popups.push(msg); }
    };
}

function makePage(opts) {
    opts = opts || {};
    return new PageMarkerManagerHW({
        pager: opts.pager || fakePager(),
        launchpad: opts.launchpad || fakeLaunchpad(),
        projectExplorer: opts.projectExplorer || fakeProjectExplorer(),
        bitwig: opts.bitwig || fakeBitwig(),
        bitwigActions: opts.bitwigActions || fakeBitwigActions(),
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// page has correct id and pageNumber
(function() {
    var page = makePage();
    assert(page.id === "marker-manager", "id should be marker-manager");
    assert(page.pageNumber === 2, "pageNumber should be 2");
})();

// show() initializes ProjectExplorer
(function() {
    var pe = fakeProjectExplorer();
    var page = makePage({ projectExplorer: pe });
    page.show();
    assert(pe.calls.indexOf('registerBehaviors') !== -1, "should register PE behaviors");
    assert(pe.calls.indexOf('autoResolution') !== -1, "should call autoResolution");
    assert(pe.calls.indexOf('refresh') !== -1, "should refresh PE");
})();

// show() registers action button behaviors on launchpad
(function() {
    var lp = fakeLaunchpad();
    var page = makePage({ launchpad: lp });
    page.show();
    var registered = lp.calls.filter(function(c) { return c.method === 'registerPadBehavior'; });
    assert(registered.length === 5, "should register 5 action button behaviors");
    var notes = registered.map(function(c) { return c.note; });
    assert(notes.indexOf(89) !== -1, "should register toggleMode (89)");
    assert(notes.indexOf(79) !== -1, "should register insertSilence (79)");
    assert(notes.indexOf(69) !== -1, "should register copy (69)");
    assert(notes.indexOf(59) !== -1, "should register paste (59)");
    assert(notes.indexOf(49) !== -1, "should register stop (49)");
})();

// show() paints action buttons with correct colors
(function() {
    var pager = fakePager();
    var page = makePage({ pager: pager });
    page.show();
    assert(pager.paints.length === 5, "should paint 5 action buttons");
    var paintMap = {};
    pager.paints.forEach(function(p) { paintMap[p.pad] = p.color; });
    assert(paintMap[89] === 53, "toggleMode should be pink (53)");
    assert(paintMap[79] === 49, "insertSilence should be purple (49)");
    assert(paintMap[69] === 37, "copy should be cyan (37)");
    assert(paintMap[59] === 21, "paste should be green (21)");
    assert(paintMap[49] === 5, "stop should be red (5)");
})();

// action button: toggleMode click invokes correct action
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var h = fakeHost();
    var page = makePage({ launchpad: lp, bitwig: bw, host: h });
    page.registerActionBehaviors();
    var reg = lp.calls.filter(function(c) { return c.note === 89; })[0];
    reg.click();
    assert(bw.calls[0].method === 'invokeAction', "should call invokeAction");
    assert(bw.calls[0].action === 'toggle_obj_time', "should toggle obj/time");
    assert(h.popups.length === 1, "should show popup");
})();

// action button: insertSilence click and hold
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var h = fakeHost();
    var page = makePage({ launchpad: lp, bitwig: bw, host: h });
    page.registerActionBehaviors();
    var reg = lp.calls.filter(function(c) { return c.note === 79; })[0];
    reg.click();
    assert(bw.calls[0].action === 'insert_silence', "click should insert silence");
    bw.calls.length = 0;
    reg.hold();
    assert(bw.calls[0].action === 'remove_time', "hold should remove time");
})();

// action button: copy click and hold
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var page = makePage({ launchpad: lp, bitwig: bw });
    page.registerActionBehaviors();
    var reg = lp.calls.filter(function(c) { return c.note === 69; })[0];
    reg.click();
    assert(bw.calls[0].method === 'copy', "click should copy");
    bw.calls.length = 0;
    reg.hold();
    assert(bw.calls[0].action === 'cut_time', "hold should cut time");
})();

// action button: paste click invokes paste + insert cue marker
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var page = makePage({ launchpad: lp, bitwig: bw });
    page.registerActionBehaviors();
    var reg = lp.calls.filter(function(c) { return c.note === 59; })[0];
    reg.click();
    assert(bw.calls[0].method === 'paste', "should paste");
    assert(bw.calls[1].action === 'insert_cue_marker', "should insert cue marker");
    assert(reg.hold === null, "paste should have no hold behavior");
})();

// action button: stop click invokes stop transport
(function() {
    var lp = fakeLaunchpad();
    var bw = fakeBitwig();
    var h = fakeHost();
    var page = makePage({ launchpad: lp, bitwig: bw, host: h });
    page.registerActionBehaviors();
    var reg = lp.calls.filter(function(c) { return c.note === 49; })[0];
    reg.click();
    assert(bw.calls[0].method === 'invokeAction', "should call invokeAction");
    assert(bw.calls[0].action === 'stop_transport', "should invoke stop transport");
    assert(h.popups[0] === 'Stop', "should show Stop popup");
    assert(reg.hold === null, "stop should have no hold behavior");
})();

// handlePadPress: time select modifier
(function() {
    var pe = fakeProjectExplorer();
    var page = makePage({ projectExplorer: pe });
    var result = page.handlePadPress(49); // timeSelect modifier
    assert(result === true, "should return true for timeSelect modifier");
    assert(pe.calls[0] === 'timeSelectModifierPress', "should call handleTimeSelectModifierPress");
})();

// handlePadPress: copy select modifier
(function() {
    var pe = fakeProjectExplorer();
    var page = makePage({ projectExplorer: pe });
    var result = page.handlePadPress(59); // copySelect modifier
    assert(result === true, "should return true for copySelect modifier");
    assert(pe.calls[0] === 'copySelectModifierPress', "should call handleCopySelectModifierPress");
})();

// handlePadPress: during active time select, routes to gesture handler
(function() {
    var pe = fakeProjectExplorer({ timeSelectActive: true });
    var page = makePage({ projectExplorer: pe });
    var result = page.handlePadPress(33); // arbitrary grid pad
    assert(result === true, "should return true during time select");
    assert(pe.calls[0].method === 'timeSelectPadPress', "should route to timeSelectPadPress");
    assert(pe.calls[0].pad === 33, "should pass pad note");
})();

// handlePadPress: during active copy select, routes to gesture handler
(function() {
    var pe = fakeProjectExplorer({ copySelectActive: true });
    var page = makePage({ projectExplorer: pe });
    var result = page.handlePadPress(33);
    assert(result === true, "should return true during copy select");
    assert(pe.calls[0].method === 'copySelectPadPress', "should route to copySelectPadPress");
})();

// handlePadPress: falls through to launchpad when no gesture active
(function() {
    var lp = fakeLaunchpad();
    var pe = fakeProjectExplorer();
    var page = makePage({ launchpad: lp, projectExplorer: pe });
    var result = page.handlePadPress(33);
    assert(result === true, "should return true from launchpad");
    assert(lp.calls[0].method === 'padPress', "should delegate to launchpad");
})();

// handlePadRelease: time select modifier release
(function() {
    var pe = fakeProjectExplorer();
    var page = makePage({ projectExplorer: pe });
    var result = page.handlePadRelease(49);
    assert(result === true, "should return true for timeSelect release");
    assert(pe.calls[0] === 'timeSelectModifierRelease', "should call handleTimeSelectModifierRelease");
})();

// handlePadRelease: copy select modifier release
(function() {
    var pe = fakeProjectExplorer();
    var page = makePage({ projectExplorer: pe });
    var result = page.handlePadRelease(59);
    assert(result === true, "should return true for copySelect release");
    assert(pe.calls[0] === 'copySelectModifierRelease', "should call handleCopySelectModifierRelease");
})();

// handlePadRelease: blocks grid pad release during active time select
(function() {
    var pe = fakeProjectExplorer({ timeSelectActive: true });
    var lp = fakeLaunchpad();
    var page = makePage({ projectExplorer: pe, launchpad: lp });
    var result = page.handlePadRelease(11); // pad in PE.pads
    assert(result === true, "should consume release during time select");
    assert(lp.calls.length === 0, "should not delegate to launchpad");
})();

// handlePadRelease: blocks grid pad release during active copy select
(function() {
    var pe = fakeProjectExplorer({ copySelectActive: true });
    var lp = fakeLaunchpad();
    var page = makePage({ projectExplorer: pe, launchpad: lp });
    var result = page.handlePadRelease(12); // pad in PE.pads
    assert(result === true, "should consume release during copy select");
    assert(lp.calls.length === 0, "should not delegate to launchpad");
})();

// handlePadRelease: falls through to launchpad when no gesture active
(function() {
    var lp = fakeLaunchpad();
    var page = makePage({ launchpad: lp });
    var result = page.handlePadRelease(33);
    assert(result === true, "should return true from launchpad");
    assert(lp.calls[0].method === 'padRelease', "should delegate to launchpad");
})();

// hide() clears pagination buttons
(function() {
    var lp = fakeLaunchpad();
    var pe = fakeProjectExplorer();
    var page = makePage({ launchpad: lp, projectExplorer: pe });
    page.hide();
    var topBtnCalls = lp.calls.filter(function(c) { return c.method === 'setTopButtonColor'; });
    assert(topBtnCalls.length === 2, "should clear 2 pagination buttons");
    assert(topBtnCalls[0].btn === 91, "should clear prevPage button");
    assert(topBtnCalls[0].color === 0, "prevPage should be cleared to 0");
    assert(topBtnCalls[1].btn === 92, "should clear nextPage button");
    assert(topBtnCalls[1].color === 0, "nextPage should be cleared to 0");
})();

// init() does not throw
(function() {
    var page = makePage();
    page.init();
    assert(true, "init should not throw");
})();

process.exit(t.summary('Page_MarkerManager'));
