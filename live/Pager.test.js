var PagerHW = require('./Pager');
var t = require('../test-assert');
var assert = t.assert;

function fakeLaunchpad() {
    var calls = [];
    return {
        colors: { off: 0 },
        setPadColor: function(p, c) { calls.push({ kind: 'static', p: p, c: c }); },
        setPadColorFlashing: function(p, c) { calls.push({ kind: 'flashing', p: p, c: c }); },
        setPadColorPulsing: function(p, c) { calls.push({ kind: 'pulsing', p: p, c: c }); },
        clearAll: function() { calls.push({ kind: 'clearAll' }); },
        _calls: calls
    };
}

// requestPaint on the active page sends MIDI
(function() {
    var lp = fakeLaunchpad();
    var pg = new PagerHW({ launchpad: lp });
    pg.init(1);
    pg.requestPaint(1, 11, 5);
    assert(lp._calls.length === 1, 'one MIDI call');
    assert(lp._calls[0].p === 11 && lp._calls[0].c === 5, 'right pad/color');
})();

// requestPaint on a non-active page only stores
(function() {
    var lp = fakeLaunchpad();
    var pg = new PagerHW({ launchpad: lp });
    pg.init(1);
    pg.requestPaint(2, 11, 5);
    assert(lp._calls.length === 0, 'no MIDI');
    assert(pg.getPageState(2)[11].color === 5, 'state stored');
})();

// switchToPage clears and repaints stored state
(function() {
    var lp = fakeLaunchpad();
    var pg = new PagerHW({ launchpad: lp });
    pg.init(1);
    pg.requestPaint(2, 11, 5);
    pg.requestPaintFlashing(2, 22, 7);
    pg.switchToPage(2);
    var clearCount = lp._calls.filter(function(c){return c.kind==='clearAll';}).length;
    assert(clearCount === 1, 'clearAll called once on switch');
    var statics = lp._calls.filter(function(c){return c.kind==='static';});
    var flash = lp._calls.filter(function(c){return c.kind==='flashing';});
    assert(statics.length === 1 && statics[0].p === 11, 'static pad repainted');
    assert(flash.length === 1 && flash[0].p === 22, 'flashing pad repainted');
})();

// isPageActive
(function() {
    var lp = fakeLaunchpad();
    var pg = new PagerHW({ launchpad: lp });
    pg.init(2);
    assert(pg.isPageActive(2) === true, 'active page check');
    assert(pg.isPageActive(1) === false, 'inactive page check');
})();

process.exit(t.summary('Pager (live)'));
