var PageProjectExplorerHW = require('./Page_ProjectExplorer');
var MarkerSets = require('./MarkerSets');
var t = require('../test-assert');
var assert = t.assert;

function fakeMarker(name, position) {
    return {
        name: name,
        position: position,
        color: { red: 0.5, green: 0.5, blue: 0.5 },
        marker: null
    };
}

function fakeBitwig(markers, playPos) {
    var marks = markers.slice();
    return {
        readMarkers: function() { return marks.slice(); },
        getPlayPosition: function() { return playPos || 0; },
        setPlayheadPosition: function(b) { this.lastSeek = b; },
        setTimeSelection: function(s, e) { this.lastSel = [s, e]; },
        onMarkersUpdated: function(cb) { this._markerCb = cb; },
        onPlayPosition: function(cb) { this._playCb = cb; },
        _setMarkers: function(m) { marks = m.slice(); },
        _emitMarkers: function() { if (this._markerCb) this._markerCb(); },
        _emitPlay: function(b) { playPos = b; if (this._playCb) this._playCb(b); }
    };
}

function fakeLaunchpad() {
    var behaviors = {};
    return {
        colors: { off: 0, white: 3, purple: 49 },
        buttons: { up:104, down:105, left:106, right:107 },
        bitwigColorToLaunchpad: function(r, g, b) { return Math.round(r * 100) + Math.round(g * 10) + Math.round(b); },
        registerPadBehavior: function(note, click, hold, page) {
            behaviors[note] = { click: click, hold: hold, page: page };
        },
        _behaviors: behaviors
    };
}

function fakePager() {
    var paints = [];
    var active = 2;
    return {
        requestPaint: function(p, pad, color) { paints.push({ p: p, pad: pad, color: color, mode: 'static' }); },
        requestPaintFlashing: function(p, pad, color) { paints.push({ p: p, pad: pad, color: color, mode: 'flashing' }); },
        isPageActive: function(p) { return p === active; },
        _paints: paints,
        _setActive: function(p) { active = p; }
    };
}

// reading-order pad layout: top-left = 81, top-right = 88, bottom-right = 18
(function() {
    var pads = PageProjectExplorerHW.PADS;
    assert(pads.length === 64, '64 pads');
    assert(pads[0] === 81, 'pad 0 = top-left = 81');
    assert(pads[7] === 88, 'pad 7 = top-right = 88');
    assert(pads[8] === 71, 'pad 8 = next row left = 71');
    assert(pads[63] === 18, 'pad 63 = bottom-right = 18');
})();

// rebuildFromBitwig with one song picks bars-per-pad = 1 and lays out 8 pads
(function() {
    var markers = [
        fakeMarker('{ song', 0),
        fakeMarker('a', 0),
        fakeMarker('b', 16),
        fakeMarker('}', 32)
    ];
    var bw = fakeBitwig(markers, 0);
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var pe = new PageProjectExplorerHW({
        bitwig: bw, launchpad: lp, pager: pg, host: null,
        markerSets: MarkerSets, pageNumber: 2, beatsPerBar: 4
    });
    pe.init();
    assert(pe.getCurrentSongIndex() === 0, 'song 0 active');
    assert(pe.getBarsPerPad() === 1, 'auto resolution = 1');
    assert(pe.getTotalBarPages() === 1, '1 bar page');
    // 32 beats / 4 bpb / 1 bpp = 8 pads
    var laidOut = 0;
    for (var i = 0; i < pg._paints.length; i++) {
        if (pg._paints[i].color !== lp.colors.off && pg._paints[i].mode === 'static') laidOut++;
    }
    // 8 pads colored from markers a/b, the rest are 'off'
    assert(laidOut === 8, '8 colored pads, got ' + laidOut);
})();

// auto resolution scales up for long songs
(function() {
    var markers = [
        fakeMarker('{ song', 0),
        fakeMarker('a', 0),
        fakeMarker('}', 1024)  // 256 bars
    ];
    var bw = fakeBitwig(markers, 0);
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var pe = new PageProjectExplorerHW({
        bitwig: bw, launchpad: lp, pager: pg, host: null,
        markerSets: MarkerSets, pageNumber: 2, beatsPerBar: 4
    });
    pe.init();
    // 256 bars / 4 bpp = 64 pads -> fits at 4
    assert(pe.getBarsPerPad() === 4, 'long song picks 4 bars/pad, got ' + pe.getBarsPerPad());
})();

// playhead auto-follow: crossing into a new song switches songs
(function() {
    var markers = [
        fakeMarker('{ a', 0),  fakeMarker('}', 16),
        fakeMarker('{ b', 16), fakeMarker('}', 32)
    ];
    var bw = fakeBitwig(markers, 0);
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var pe = new PageProjectExplorerHW({
        bitwig: bw, launchpad: lp, pager: pg, host: null,
        markerSets: MarkerSets, pageNumber: 2, beatsPerBar: 4
    });
    pe.init();
    assert(pe.getCurrentSongIndex() === 0, 'starts on song a');
    bw._emitPlay(20);
    assert(pe.getCurrentSongIndex() === 1, 'auto-followed into song b');
})();

// pad click seeks
(function() {
    var markers = [
        fakeMarker('{ song', 0),
        fakeMarker('a', 0),
        fakeMarker('b', 16),
        fakeMarker('}', 32)
    ];
    var bw = fakeBitwig(markers, 0);
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var pe = new PageProjectExplorerHW({
        bitwig: bw, launchpad: lp, pager: pg, host: null,
        markerSets: MarkerSets, pageNumber: 2, beatsPerBar: 4
    });
    pe.init();
    // pads[0] = 81 = first beat (0), pads[4] = 85 = beat 16
    lp._behaviors[81].click();
    assert(bw.lastSeek === 0, 'click pad 0 seeks to beat 0');
    lp._behaviors[85].click();
    assert(bw.lastSeek === 16, 'click pad 4 seeks to beat 16');
})();

// time selection gesture writes a loop
(function() {
    var markers = [
        fakeMarker('{ song', 0),
        fakeMarker('a', 0),
        fakeMarker('}', 32)
    ];
    var bw = fakeBitwig(markers, 0);
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var pe = new PageProjectExplorerHW({
        bitwig: bw, launchpad: lp, pager: pg, host: null,
        markerSets: MarkerSets, pageNumber: 2, beatsPerBar: 4
    });
    pe.init();
    pe.handleTimeSelectModifierPress();
    lp._behaviors[81].click();  // pad 0 (beat 0..4)
    lp._behaviors[83].click();  // pad 2 (beat 8..12)
    assert(bw.lastSel !== undefined, 'setTimeSelection called');
    assert(bw.lastSel[0] === 0 && bw.lastSel[1] === 12, 'loop range is 0..12');
})();

// resolution override via decreaseResolution
(function() {
    var markers = [
        fakeMarker('{ song', 0),
        fakeMarker('a', 0),
        fakeMarker('}', 32)
    ];
    var bw = fakeBitwig(markers, 0);
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var pe = new PageProjectExplorerHW({
        bitwig: bw, launchpad: lp, pager: pg, host: null,
        markerSets: MarkerSets, pageNumber: 2, beatsPerBar: 4
    });
    pe.init();
    assert(pe.getBarsPerPad() === 1, 'starts at 1');
    pe.decreaseResolution();
    assert(pe.getBarsPerPad() === 2, 'now at 2');
    pe.increaseResolution();
    assert(pe.getBarsPerPad() === 1, 'back at 1');
    // clamped
    pe.increaseResolution();
    assert(pe.getBarsPerPad() === 1, 'clamped at 1');
    for (var i = 0; i < 10; i++) pe.decreaseResolution();
    assert(pe.getBarsPerPad() === 32, 'clamped at 32');
})();

// markers updated triggers a rebuild
(function() {
    var markers = [
        fakeMarker('{ a', 0), fakeMarker('}', 16)
    ];
    var bw = fakeBitwig(markers, 0);
    var lp = fakeLaunchpad();
    var pg = fakePager();
    var pe = new PageProjectExplorerHW({
        bitwig: bw, launchpad: lp, pager: pg, host: null,
        markerSets: MarkerSets, pageNumber: 2, beatsPerBar: 4
    });
    pe.init();
    assert(pe.getSongCount() === 1, 'one song');
    bw._setMarkers([
        fakeMarker('{ a', 0), fakeMarker('}', 16),
        fakeMarker('{ b', 16), fakeMarker('}', 32)
    ]);
    bw._emitMarkers();
    assert(pe.getSongCount() === 2, 'two songs after marker update');
})();

process.exit(t.summary('Page_ProjectExplorer'));
