var Animations = require('./Animations');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    return {
        colors: { white: 3, off: 0 },
        cleared: [],
        painted: [],
        clearPad: function(pad) { this.cleared.push(pad); },
        setPadColor: function(pad, color) { this.painted.push({ pad: pad, color: color }); }
    };
}

function fakeHost() {
    var tasks = [];
    return {
        tasks: tasks,
        scheduleTask: function(fn, _arg, delay) {
            tasks.push({ fn: fn, delay: delay });
        },
        runAll: function() {
            while (tasks.length > 0) {
                var t = tasks.shift();
                t.fn();
            }
        }
    };
}

// ---- tests ----

// unknown page number calls callback immediately
(function() {
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var anim = new Animations({ launchpad: lp, host: h });

    var called = false;
    anim.flashPageNumber(99, function() { called = true; });
    assert(called, 'callback called immediately for unknown page');
    assert(h.tasks.length === 0, 'no scheduled tasks for unknown page');
    // assert(true === false, 'failing on purpose');
})();

// unknown page number without callback does not throw
(function() {
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var anim = new Animations({ launchpad: lp, host: h });

    anim.flashPageNumber(99);  // should not throw
    assert(true, 'no throw for unknown page without callback');
})();

// clears all 128 pads at the start
(function() {
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var anim = new Animations({ launchpad: lp, host: h });

    anim.flashPageNumber(1, function() {});
    assert(lp.cleared.length >= 128, 'clears all 128 pads at start');
    for (var i = 0; i < 128; i++) {
        assert(lp.cleared[i] === i, 'clears pad ' + i);
    }
})();

// page 1 pattern lights the correct pads on first flash
(function() {
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var anim = new Animations({ launchpad: lp, host: h });

    anim.flashPageNumber(1, function() {});
    var expected = [24, 34, 44, 54, 64, 74];
    assert(lp.painted.length === expected.length,
        'page 1 lights exactly ' + expected.length + ' pads, got ' + lp.painted.length);
    for (var i = 0; i < expected.length; i++) {
        assert(lp.painted[i].pad === expected[i],
            'page 1 pad ' + i + ' is ' + expected[i]);
        assert(lp.painted[i].color === lp.colors.white,
            'page 1 pad ' + i + ' is white');
    }
})();

// full animation cycle: 2 on/off cycles then callback
(function() {
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var anim = new Animations({ launchpad: lp, host: h });

    var done = false;
    anim.flashPageNumber(1, function() { done = true; });
    assert(!done, 'not done after first flash');
    h.runAll();
    assert(done, 'done after running all scheduled tasks');
})();

// scheduled tasks use the correct interval
(function() {
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var anim = new Animations({ launchpad: lp, host: h });

    anim.flashPageNumber(2, function() {});
    assert(h.tasks.length === 1, 'one task scheduled after first flash');
    assert(h.tasks[0].delay === 80, 'interval is 80ms');
})();

// page 2 and 3 patterns exist and produce pad activity
(function() {
    [2, 3].forEach(function(pageNum) {
        var lp = fakeLaunchpad();
        var h = fakeHost();
        var anim = new Animations({ launchpad: lp, host: h });

        anim.flashPageNumber(pageNum, function() {});
        assert(lp.painted.length > 0,
            'page ' + pageNum + ' lights pads');
    });
})();

// alternates between on and off during flash cycles
(function() {
    var lp = fakeLaunchpad();
    var h = fakeHost();
    var anim = new Animations({ launchpad: lp, host: h });

    anim.flashPageNumber(1, function() {});
    var firstPaintCount = lp.painted.length;

    // run one scheduled task (should be the "off" cycle)
    var task = h.tasks.shift();
    lp.cleared = [];
    task.fn();

    // the "off" cycle clears the pattern pads
    assert(lp.cleared.length > 0,
        'off cycle clears pattern pads');
})();

// ---- summary ----

process.exit(t.summary('Animations'));
