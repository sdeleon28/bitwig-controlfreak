var ModeSwitcherHW = require('./ModeSwitcher');
var t = require('../test-assert');
var assert = t.assert;

function fakeLaunchpad() {
    return {
        colors: { off: 0, green: 21 },
        sideButtons: { volume: 89, pan: 79 },
        _sideHandlers: {}, _sideColors: {},
        registerSideButton: function(n, fn) { this._sideHandlers[n] = fn; },
        setSideButtonColor: function(n, c) { this._sideColors[n] = c; }
    };
}

function fakeTwister() {
    var mode = 'volume';
    return {
        setMode: function(m) { mode = m; },
        getMode: function() { return mode; }
    };
}

(function() {
    var lp = fakeLaunchpad(); var tw = fakeTwister();
    var ms = new ModeSwitcherHW({ launchpad: lp, twister: tw, host: null });
    ms.init();
    assert(lp._sideColors[89] === lp.colors.green, 'volume bright on init');
    assert(lp._sideColors[79] === lp.colors.off, 'pan dim on init');

    lp._sideHandlers[79]();  // press pan
    assert(tw.getMode() === 'pan', 'twister flipped to pan');
    assert(lp._sideColors[79] === lp.colors.green, 'pan bright after press');
    assert(lp._sideColors[89] === lp.colors.off, 'volume dim after press');

    lp._sideHandlers[89]();
    assert(tw.getMode() === 'volume', 'back to volume');
})();

process.exit(t.summary('ModeSwitcher'));
