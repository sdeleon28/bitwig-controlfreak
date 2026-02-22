var PageDebugActionsHW = require('./Page_DebugActions');
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

function fakeBitwig() {
    var calls = [];
    return {
        calls: calls,
        invokeAction: function(action) { calls.push({ method: 'invokeAction', action: action }); },
        setTimeSelection: function(start, end) { calls.push({ method: 'setTimeSelection', start: start, end: end }); },
        setPlayheadPosition: function(pos) { calls.push({ method: 'setPlayheadPosition', pos: pos }); },
        _application: {
            selectAll: function() { calls.push({ method: 'selectAll' }); },
            selectNone: function() { calls.push({ method: 'selectNone' }); },
            copy: function() { calls.push({ method: 'copy' }); },
            paste: function() { calls.push({ method: 'paste' }); },
            getActions: function() {
                calls.push({ method: 'getActions' });
                return [
                    { getId: function() { return "loop_toggle"; }, getName: function() { return "Loop Toggle"; } },
                    { getId: function() { return "some_other"; }, getName: function() { return "Other Action"; } }
                ];
            }
        },
        _transport: {
            setLoop: function(val) { calls.push({ method: 'setLoop', value: val }); },
            arrangerLoopStart: function() { return { get: function() { return 16; } }; },
            arrangerLoopDuration: function() { return { get: function() { return 32; } }; }
        }
    };
}

function fakeBitwigActions() {
    return {
        TOGGLE_OBJECT_TIME_SELECTION: 'toggle_obj_time',
        INSERT_SILENCE: 'insert_silence',
        SPLIT: 'split',
        TOOL_POINTER: 'tool_pointer',
        LOOP_SELECTION: 'loop_selection',
        SELECT_EVERYTHING: 'select_everything',
        TOOL_OBJECT_SELECTION: 'tool_object_selection',
        TOOL_TIME_SELECTION: 'tool_time_selection',
        TOOL_EVENT_SELECTION: 'tool_event_selection',
        REMOVE_TIME: 'remove_time',
        CUT_TIME: 'cut_time',
        INSERT_CUE_MARKER: 'insert_cue_marker'
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
    return new PageDebugActionsHW({
        pager: opts.pager || fakePager(),
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
    assert(page.id === "debug-actions", "id should be debug-actions");
    assert(page.pageNumber === 4, "pageNumber should be 4");
})();

// refresh() paints amber, pink, green, yellow, cyan, purple pads
(function() {
    var pager = fakePager();
    var page = makePage({ pager: pager });
    page.refresh();
    // 12 amber + 4 pink + 4 green + 1 yellow + 1 cyan + 1 purple = 23
    assert(pager.paints.length === 23, "should paint 23 pads, got " + pager.paints.length);
    // All paints should target page 4
    var allPage4 = pager.paints.every(function(p) { return p.page === 4; });
    assert(allPage4, "all paints should target page 4");
    // Check specific colors
    var yellowPaint = pager.paints.filter(function(p) { return p.pad === 55; });
    assert(yellowPaint.length === 1 && yellowPaint[0].color === 13, "pad 55 should be yellow (13)");
})();

// pad 81: sets time selection TARGET
(function() {
    var bw = fakeBitwig();
    var h = fakeHost();
    var page = makePage({ bitwig: bw, host: h });
    var result = page.handlePadPress(81);
    assert(result === true, "should return true");
    assert(bw.calls[0].method === 'setTimeSelection', "should call setTimeSelection");
    assert(bw.calls[0].start === 32, "start should be 32");
    assert(bw.calls[0].end === 48, "end should be 48");
    assert(h.popups[0].indexOf("TARGET") !== -1, "popup should mention TARGET");
})();

// pad 82: toggles Object/Time Selection
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(82);
    assert(bw.calls[0].method === 'invokeAction', "should call invokeAction");
    assert(bw.calls[0].action === 'toggle_obj_time', "should toggle obj/time selection");
})();

// pad 83: Insert Silence
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(83);
    assert(bw.calls[0].action === 'insert_silence', "should invoke insert_silence");
})();

// pad 85: Split
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(85);
    assert(bw.calls[0].action === 'split', "should invoke split");
})();

// pad 87: Select All via _application
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(87);
    assert(bw.calls[0].method === 'selectAll', "should call selectAll");
})();

// pad 71: Copy via _application
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(71);
    assert(bw.calls[0].method === 'copy', "should call copy");
})();

// pad 72: Move playhead
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(72);
    assert(bw.calls[0].method === 'setPlayheadPosition', "should call setPlayheadPosition");
    assert(bw.calls[0].pos === 32, "position should be 32");
})();

// pad 73: Paste via _application
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(73);
    assert(bw.calls[0].method === 'paste', "should call paste");
})();

// pad 51: Select None
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(51);
    assert(bw.calls[0].method === 'selectNone', "should call selectNone");
})();

// pad 52: Set Loop ON
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(52);
    assert(bw.calls[0].method === 'setLoop', "should call setLoop");
    assert(bw.calls[0].value === true, "should set loop to true");
})();

// pad 53: Set Loop OFF
(function() {
    var bw = fakeBitwig();
    var page = makePage({ bitwig: bw });
    page.handlePadPress(53);
    assert(bw.calls[0].method === 'setLoop', "should call setLoop");
    assert(bw.calls[0].value === false, "should set loop to false");
})();

// pad 55: Copy loop bounds to time selection
(function() {
    var bw = fakeBitwig();
    var h = fakeHost();
    var page = makePage({ bitwig: bw, host: h });
    page.handlePadPress(55);
    assert(bw.calls[0].method === 'setTimeSelection', "should call setTimeSelection");
    assert(bw.calls[0].start === 16, "start should be 16 (from loop start)");
    assert(bw.calls[0].end === 48, "end should be 48 (16 + 32)");
    assert(h.popups[0].indexOf("16") !== -1, "popup should show loop start");
})();

// pad 56: Detective action logs filtered actions
(function() {
    var bw = fakeBitwig();
    var h = fakeHost();
    var page = makePage({ bitwig: bw, host: h });
    page.handlePadPress(56);
    assert(bw.calls[0].method === 'getActions', "should call getActions");
    assert(h.popups[0].indexOf("Detective") !== -1, "popup should mention Detective");
})();

// unhandled pad returns false
(function() {
    var page = makePage();
    assert(page.handlePadPress(11) === false, "pad 11 should return false");
    assert(page.handlePadPress(99) === false, "pad 99 should return false");
})();

// handlePadRelease always returns false
(function() {
    var page = makePage();
    assert(page.handlePadRelease(81) === false, "release should return false");
})();

// init() and hide() do not throw
(function() {
    var page = makePage();
    page.init();
    page.hide();
    assert(true, "init and hide should not throw");
})();

process.exit(t.summary('Page_DebugActions'));
