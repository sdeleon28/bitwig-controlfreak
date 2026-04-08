var PageControlHW = require('./Page_Control');
var QuadrantHW = PageControlHW.LiveQuadrant;
var RecArmQuadrant = PageControlHW.RecArmQuadrant;
var SoloQuadrant = PageControlHW.SoloQuadrant;
var SelectQuadrant = PageControlHW.SelectQuadrant;
var MuteQuadrant = PageControlHW.MuteQuadrant;
var t = require('../test-assert');
var assert = t.assert;

function makeFakeTrack(props) {
    props = props || {};
    var armed = !!props.armed;
    var soloed = !!props.soloed;
    var muted = !!props.muted;
    var color = props.color || { red: 0, green: 0, blue: 0 };
    var visibleCalls = 0;
    var selectCalls = 0;
    var t = {
        arm: function() {
            return {
                get: function() { return armed; },
                toggle: function() { armed = !armed; }
            };
        },
        solo: function() {
            return {
                get: function() { return soloed; },
                toggle: function() { soloed = !soloed; }
            };
        },
        mute: function() {
            return {
                get: function() { return muted; },
                toggle: function() { muted = !muted; }
            };
        },
        color: function() {
            return {
                red: function() { return color.red; },
                green: function() { return color.green; },
                blue: function() { return color.blue; }
            };
        },
        selectInMixer: function() { selectCalls++; },
        makeVisibleInArranger: function() { visibleCalls++; },
        _state: function() { return { armed: armed, soloed: soloed, muted: muted, selects: selectCalls, visibles: visibleCalls }; }
    };
    return t;
}

function makeFakeBitwig(slotMap, tracks) {
    return {
        getTrackIdForSlot: function(n) { return slotMap[n] !== undefined ? slotMap[n] : null; },
        getTrack: function(id) { return tracks[id] || null; },
        onTracksUpdated: function(cb) { this._cb = cb; },
        _trigger: function() { if (this._cb) this._cb(); }
    };
}

function makeFakeLaunchpad() {
    var behaviors = {};
    return {
        colors: { off: 0, red: 5, yellow: 13, orange: 9, green: 21 },
        bitwigColorToLaunchpad: function(r, g, b) { return Math.round(r * 100) + Math.round(g * 10) + Math.round(b); },
        registerPadBehavior: function(note, click, hold, page) {
            behaviors[note] = { click: click, hold: hold, page: page };
        },
        _behaviors: behaviors
    };
}

function makeFakePager() {
    var paints = [];
    return {
        requestPaint: function(page, pad, color) { paints.push({ page: page, pad: pad, color: color }); },
        _paints: paints,
        _last: function(pad) {
            for (var i = paints.length - 1; i >= 0; i--) {
                if (paints[i].pad === pad) return paints[i];
            }
            return null;
        }
    };
}

// Quadrant geometry: bottom-left, slot 1 maps to launchpad note 11
(function() {
    var q = new QuadrantHW({ xOffset: 0, yOffset: 0 });
    assert(q.localToNote(1) === 11, 'BL slot 1 -> note 11');
    assert(q.localToNote(4) === 14, 'BL slot 4 -> note 14');
    assert(q.localToNote(5) === 21, 'BL slot 5 -> note 21');
    assert(q.localToNote(16) === 44, 'BL slot 16 -> note 44');
})();

// Quadrant geometry: bottom-right
(function() {
    var q = new QuadrantHW({ xOffset: 4, yOffset: 0 });
    assert(q.localToNote(1) === 15, 'BR slot 1 -> note 15');
    assert(q.localToNote(16) === 48, 'BR slot 16 -> note 48');
})();

// Quadrant geometry: top-left
(function() {
    var q = new QuadrantHW({ xOffset: 0, yOffset: 4 });
    assert(q.localToNote(1) === 51, 'TL slot 1 -> note 51');
    assert(q.localToNote(16) === 84, 'TL slot 16 -> note 84');
})();

// Quadrant geometry: top-right
(function() {
    var q = new QuadrantHW({ xOffset: 4, yOffset: 4 });
    assert(q.localToNote(1) === 55, 'TR slot 1 -> note 55');
    assert(q.localToNote(16) === 88, 'TR slot 16 -> note 88');
})();

// noteToLocal is the inverse of localToNote inside the quadrant region
(function() {
    var q = new QuadrantHW({ xOffset: 4, yOffset: 4 });
    for (var i = 1; i <= 16; i++) {
        var note = q.localToNote(i);
        assert(q.noteToLocal(note) === i, 'noteToLocal inverse for slot ' + i);
    }
    assert(q.noteToLocal(11) === null, 'note outside region returns null');
})();

// RecArm: armed track -> red
(function() {
    var track = makeFakeTrack({ armed: true });
    var pager = makeFakePager();
    var lp = makeFakeLaunchpad();
    var bw = makeFakeBitwig({ 1: 0 }, { 0: track });
    var q = new RecArmQuadrant({ bitwig: bw, launchpad: lp, pager: pager, pageNumber: 1 });
    q.paint();
    assert(pager._last(11).color === lp.colors.red, 'armed track shows red');
})();

// RecArm: not armed -> track color
(function() {
    var track = makeFakeTrack({ armed: false, color: { red: 1, green: 0, blue: 0 } });
    var pager = makeFakePager();
    var lp = makeFakeLaunchpad();
    var bw = makeFakeBitwig({ 1: 0 }, { 0: track });
    var q = new RecArmQuadrant({ bitwig: bw, launchpad: lp, pager: pager, pageNumber: 1 });
    q.paint();
    assert(pager._last(11).color === 100, 'not-armed track uses track color');
})();

// RecArm: empty slot -> off
(function() {
    var pager = makeFakePager();
    var lp = makeFakeLaunchpad();
    var bw = makeFakeBitwig({}, {});
    var q = new RecArmQuadrant({ bitwig: bw, launchpad: lp, pager: pager, pageNumber: 1 });
    q.paint();
    assert(pager._last(11).color === lp.colors.off, 'empty slot painted off');
})();

// Solo: click toggles solo
(function() {
    var track = makeFakeTrack({ soloed: false });
    var pager = makeFakePager();
    var lp = makeFakeLaunchpad();
    var bw = makeFakeBitwig({ 1: 0 }, { 0: track });
    var q = new SoloQuadrant({ bitwig: bw, launchpad: lp, pager: pager, pageNumber: 1 });
    q.registerBehaviors();
    var note = q.localToNote(1);
    lp._behaviors[note].click();
    assert(track._state().soloed === true, 'click toggles solo on');
})();

// Mute: muted track -> orange
(function() {
    var track = makeFakeTrack({ muted: true });
    var pager = makeFakePager();
    var lp = makeFakeLaunchpad();
    var bw = makeFakeBitwig({ 1: 0 }, { 0: track });
    var q = new MuteQuadrant({ bitwig: bw, launchpad: lp, pager: pager, pageNumber: 1 });
    q.paint();
    assert(pager._last(55).color === lp.colors.orange, 'muted track shows orange');
})();

// Select: click selects + makes visible
(function() {
    var track = makeFakeTrack({});
    var pager = makeFakePager();
    var lp = makeFakeLaunchpad();
    var bw = makeFakeBitwig({ 1: 0 }, { 0: track });
    var q = new SelectQuadrant({ bitwig: bw, launchpad: lp, pager: pager, pageNumber: 1 });
    q.registerBehaviors();
    var note = q.localToNote(1);
    lp._behaviors[note].click();
    var s = track._state();
    assert(s.selects === 1, 'selectInMixer called once');
    assert(s.visibles === 1, 'makeVisibleInArranger called once');
})();

// PageControl: paint touches all 4 quadrants
(function() {
    var armed = makeFakeTrack({ armed: true });
    var muted = makeFakeTrack({ muted: true });
    var pager = makeFakePager();
    var lp = makeFakeLaunchpad();
    var bw = makeFakeBitwig({ 1: 0, 2: 1 }, { 0: armed, 1: muted });
    var page = new PageControlHW({ bitwig: bw, launchpad: lp, pager: pager, pageNumber: 1 });
    page.paint();
    // Recarm slot 1 -> note 11 -> red
    assert(pager._last(11).color === lp.colors.red, 'recarm slot 1 painted red');
    // Solo slot 1 -> note 15 -> not soloed -> color
    // Select slot 1 -> note 51
    // Mute slot 1 -> note 55 -> not muted -> color (because slot 1 is the armed track)
    assert(pager._last(15) !== null, 'solo quadrant slot 1 painted');
    assert(pager._last(51) !== null, 'select quadrant slot 1 painted');
    assert(pager._last(55) !== null, 'mute quadrant slot 1 painted');
    // Mute slot 2 -> mute quadrant local 2 -> note 56
    assert(pager._last(56) !== null && pager._last(56).color === lp.colors.orange, 'slot 2 mute is orange');
})();

// PageControl: onTracksUpdated triggers a full repaint
(function() {
    var track = makeFakeTrack({});
    var pager = makeFakePager();
    var lp = makeFakeLaunchpad();
    var bw = makeFakeBitwig({ 1: 0 }, { 0: track });
    var page = new PageControlHW({ bitwig: bw, launchpad: lp, pager: pager, pageNumber: 1 });
    page.init();
    var paintsBefore = pager._paints.length;
    bw._trigger();
    assert(pager._paints.length > paintsBefore, 'tracks updated -> repaint');
})();

process.exit(t.summary('Page_Control'));
