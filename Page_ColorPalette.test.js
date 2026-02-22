var PageColorPaletteHW = require('./Page_ColorPalette');
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

function fakeHost() {
    var popups = [];
    return {
        popups: popups,
        showPopupNotification: function(msg) { popups.push(msg); }
    };
}

function makePage(opts) {
    opts = opts || {};
    return new PageColorPaletteHW({
        id: opts.id || "color-palette-1",
        pageNumber: opts.pageNumber || 5,
        colorOffset: opts.colorOffset || 0,
        pager: opts.pager || fakePager(),
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// first instance has correct defaults
(function() {
    var page = makePage();
    assert(page.id === "color-palette-1", "id should be color-palette-1");
    assert(page.pageNumber === 5, "pageNumber should be 5");
    assert(page.colorOffset === 0, "colorOffset should be 0");
})();

// second instance has correct config
(function() {
    var page = makePage({ id: "color-palette-2", pageNumber: 6, colorOffset: 64 });
    assert(page.id === "color-palette-2", "id should be color-palette-2");
    assert(page.pageNumber === 6, "pageNumber should be 6");
    assert(page.colorOffset === 64, "colorOffset should be 64");
})();

// both instances share the same PAD_NOTES array
(function() {
    var page1 = makePage();
    var page2 = makePage({ id: "color-palette-2", pageNumber: 6, colorOffset: 64 });
    assert(page1.padNotes === page2.padNotes, "both instances should share padNotes");
    assert(page1.padNotes === PageColorPaletteHW.PAD_NOTES, "padNotes should reference static PAD_NOTES");
})();

// PAD_NOTES has 64 entries
(function() {
    assert(PageColorPaletteHW.PAD_NOTES.length === 64, "PAD_NOTES should have 64 entries");
})();

// show() paints 64 pads with colors 0-63 for first page
(function() {
    var pager = fakePager();
    var page = makePage({ pager: pager });
    page.show();
    assert(pager.paints.length === 64, "should paint 64 pads");
    // First pad: color 0
    assert(pager.paints[0].page === 5, "first paint should target page 5");
    assert(pager.paints[0].pad === 11, "first pad should be 11");
    assert(pager.paints[0].color === 0, "first color should be 0");
    // Last pad: color 63
    assert(pager.paints[63].color === 63, "last color should be 63");
})();

// show() paints 64 pads with colors 64-127 for second page
(function() {
    var pager = fakePager();
    var page = makePage({ pager: pager, pageNumber: 6, colorOffset: 64 });
    page.show();
    assert(pager.paints.length === 64, "should paint 64 pads");
    assert(pager.paints[0].page === 6, "first paint should target page 6");
    assert(pager.paints[0].color === 64, "first color should be 64");
    assert(pager.paints[63].color === 127, "last color should be 127");
})();

// handlePadPress returns true for valid pad
(function() {
    var page = makePage();
    assert(page.handlePadPress(11) === true, "pad 11 should return true");
    assert(page.handlePadPress(55) === true, "pad 55 should return true");
    assert(page.handlePadPress(88) === true, "pad 88 should return true");
})();

// handlePadPress returns false for unknown pads
(function() {
    var page = makePage();
    assert(page.handlePadPress(10) === false, "pad 10 should return false");
    assert(page.handlePadPress(19) === false, "pad 19 should return false");
    assert(page.handlePadPress(89) === false, "pad 89 should return false");
    assert(page.handlePadPress(99) === false, "pad 99 should return false");
})();

// handlePadPress shows popup with correct color value (offset 0)
(function() {
    var h = fakeHost();
    var page = makePage({ host: h });
    page.handlePadPress(11); // first pad, color 0
    assert(h.popups.length === 1, "should show one popup");
    assert(h.popups[0].indexOf("Color: 0") !== -1, "popup should show color 0");
})();

// handlePadPress shows popup with correct color value (offset 64)
(function() {
    var h = fakeHost();
    var page = makePage({ host: h, colorOffset: 64 });
    page.handlePadPress(11); // first pad, color 64
    assert(h.popups[0].indexOf("Color: 64") !== -1, "popup should show color 64");
})();

// handlePadRelease always returns false
(function() {
    var page = makePage();
    assert(page.handlePadRelease(11) === false, "release should return false");
    assert(page.handlePadRelease(55) === false, "release should return false");
})();

// init() and hide() do not throw
(function() {
    var page = makePage();
    page.init();
    page.hide();
    assert(true, "init and hide should not throw");
})();

process.exit(t.summary('Page_ColorPalette'));
