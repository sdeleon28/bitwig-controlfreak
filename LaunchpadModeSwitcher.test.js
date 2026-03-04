var LaunchpadModeSwitcherHW = require('./LaunchpadModeSwitcher');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    var behaviors = {};
    var clickTracking = {};
    return {
        colors: { off: 0, green: 21, red: 5, amber: 17, yellow: 13, blue: 45, cyan: 41, purple: 49, pink: 53, white: 3 },
        brightness: { dim: 'dim', bright: 'bright' },
        holdTiming: { clickThreshold: 400 },
        colorVariants: {
            21: { dim: 19, bright: 23 },
            5: { dim: 4, bright: 6 },
            17: { dim: 11, bright: 9 },
            13: { dim: 12, bright: 14 },
            49: { dim: 48, bright: 50 },
            53: { dim: 52, bright: 95 },
            3: { dim: 1, bright: 2 }
        },
        _clickTracking: clickTracking,
        registeredBehaviors: behaviors,
        registerPadBehavior: function(pad, click, hold, page) {
            behaviors[pad] = { click: click, hold: hold, page: page };
        },
        getBrightnessVariant: function(baseColor, level) {
            var v = this.colorVariants[baseColor];
            if (v && level) return v[level] || baseColor;
            return baseColor;
        },
        trackPadPress: function(padNote) {
            if (!clickTracking[padNote]) {
                clickTracking[padNote] = { pressTime: null, clickCount: 0, lastClickTime: 0 };
            }
            clickTracking[padNote].pressTime = Date.now();
        },
        trackPadRelease: function(padNote) {
            var tracking = clickTracking[padNote];
            if (!tracking) return null;
            var now = Date.now();
            if (now - tracking.lastClickTime < this.holdTiming.clickThreshold) {
                tracking.clickCount++;
            } else {
                tracking.clickCount = 1;
            }
            tracking.lastClickTime = now;
            tracking.pressTime = null;
            if (tracking.clickCount >= 3) {
                tracking.clickCount = 0; tracking.lastClickTime = 0;
                return 'triple';
            }
            if (tracking.clickCount >= 2) {
                tracking.clickCount = 0; tracking.lastClickTime = 0;
                return 'double';
            }
            return null;
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

function fakeTwister() {
    var calls = [];
    return {
        calls: calls,
        refreshEncoderLEDsForPan: function() { calls.push('pan'); },
        refreshEncoderLEDsForVolume: function() { calls.push('volume'); }
    };
}

function fakeController() {
    var calls = [];
    return {
        calls: calls,
        refreshTrackGrid: function() { calls.push('refreshTrackGrid'); },
        toggleMultiRec: function() { calls.push('toggleMultiRec'); },
        clearAllMute: function() { calls.push('clearAllMute'); },
        clearAllSolo: function() { calls.push('clearAllSolo'); },
        clearAllArm: function() { calls.push('clearAllArm'); }
    };
}

function makeSwitcher(opts) {
    opts = opts || {};
    return new LaunchpadModeSwitcherHW({
        launchpad: opts.launchpad || fakeLaunchpad(),
        pager: opts.pager || fakePager(),
        twister: opts.twister || fakeTwister(),
        controller: opts.controller || fakeController(),
        pageMainControl: opts.pageMainControl || { pageNumber: 1 },
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// defaults to volume encoder mode and recordArm pad mode
(function() {
    var ms = makeSwitcher();
    assert(ms.getEncoderMode() === 'volume', 'default encoder mode is volume');
    assert(ms.getPadMode() === 'recordArm', 'default pad mode is recordArm');
})();

// selectEncoderMode changes mode and refreshes twister LEDs
(function() {
    var tw = fakeTwister();
    var ms = makeSwitcher({ twister: tw });
    ms.selectEncoderMode('pan');
    assert(ms.getEncoderMode() === 'pan', 'encoder mode changed to pan');
    assert(tw.calls[tw.calls.length - 1] === 'pan', 'twister refreshed for pan');
})();

// selectEncoderMode('volume') refreshes twister for volume
(function() {
    var tw = fakeTwister();
    var ms = makeSwitcher({ twister: tw });
    ms.selectEncoderMode('pan');
    ms.selectEncoderMode('volume');
    assert(ms.getEncoderMode() === 'volume', 'encoder mode back to volume');
    assert(tw.calls[tw.calls.length - 1] === 'volume', 'twister refreshed for volume');
})();

// selectEncoderMode rejects unknown modes
(function() {
    var ms = makeSwitcher();
    ms.selectEncoderMode('bogus');
    assert(ms.getEncoderMode() === 'volume', 'encoder mode unchanged for unknown mode');
})();

// selectPadMode changes mode and refreshes track grid
(function() {
    var ctrl = fakeController();
    var ms = makeSwitcher({ controller: ctrl });
    ms.selectPadMode('mute');
    assert(ms.getPadMode() === 'mute', 'pad mode changed to mute');
    assert(ctrl.calls.indexOf('refreshTrackGrid') !== -1, 'track grid refreshed');
})();

// selectPadMode rejects unknown modes
(function() {
    var ms = makeSwitcher();
    ms.selectPadMode('bogus');
    assert(ms.getPadMode() === 'recordArm', 'pad mode unchanged for unknown mode');
})();

// refresh paints active modes bright and clears inactive
(function() {
    var pager = fakePager();
    var ms = makeSwitcher({ pager: pager });
    // defaults: volume (encoder), recordArm (pad)
    pager.paints.length = 0;
    pager.clears.length = 0;
    ms.refresh();

    // volume (note 89) and recordArm (note 19) should be painted bright
    var painted = {};
    pager.paints.forEach(function(p) { painted[p.pad] = p.color; });
    assert(painted[89] !== undefined, 'volume button painted');
    assert(painted[19] !== undefined, 'recordArm button painted');

    // Other modes should be cleared
    var clearedPads = pager.clears.map(function(c) { return c.pad; });
    assert(clearedPads.indexOf(79) !== -1, 'pan button cleared');
    assert(clearedPads.indexOf(69) !== -1, 'sendA button cleared');
    assert(clearedPads.indexOf(59) !== -1, 'sendB button cleared');
    assert(clearedPads.indexOf(49) !== -1, 'select button cleared');
    assert(clearedPads.indexOf(39) !== -1, 'mute button cleared');
    assert(clearedPads.indexOf(29) !== -1, 'solo button cleared');
})();

// getModeForNote maps note numbers to mode names
(function() {
    var ms = makeSwitcher();
    assert(ms.getModeForNote(89) === 'volume', 'note 89 -> volume');
    assert(ms.getModeForNote(79) === 'pan', 'note 79 -> pan');
    assert(ms.getModeForNote(69) === 'sendA', 'note 69 -> sendA');
    assert(ms.getModeForNote(59) === 'sendB', 'note 59 -> sendB');
    assert(ms.getModeForNote(49) === 'select', 'note 49 -> select');
    assert(ms.getModeForNote(39) === 'mute', 'note 39 -> mute');
    assert(ms.getModeForNote(29) === 'solo', 'note 29 -> solo');
    assert(ms.getModeForNote(19) === 'recordArm', 'note 19 -> recordArm');
    assert(ms.getModeForNote(99) === null, 'unknown note returns null');
})();

// registerBehaviors registers click callbacks for all mode buttons
(function() {
    var lp = fakeLaunchpad();
    var ms = makeSwitcher({ launchpad: lp });
    ms.registerBehaviors();

    // All 7 active mode buttons should have behaviors (sendB has none)
    assert(lp.registeredBehaviors[89] !== undefined, 'volume button registered');
    assert(lp.registeredBehaviors[79] !== undefined, 'pan button registered');
    assert(lp.registeredBehaviors[39] !== undefined, 'mute button registered');
    assert(lp.registeredBehaviors[29] !== undefined, 'solo button registered');
    assert(lp.registeredBehaviors[19] !== undefined, 'recordArm button registered');
    assert(lp.registeredBehaviors[69] !== undefined, 'sendA button registered');
    assert(lp.registeredBehaviors[49] !== undefined, 'select button registered');
})();

// clicking volume button selects volume encoder mode
(function() {
    var lp = fakeLaunchpad();
    var ms = makeSwitcher({ launchpad: lp });
    ms.selectEncoderMode('pan'); // start at pan
    ms.registerBehaviors();
    lp.registeredBehaviors[89].click();
    assert(ms.getEncoderMode() === 'volume', 'volume click selects volume mode');
})();

// clicking mute button selects mute pad mode
(function() {
    var lp = fakeLaunchpad();
    var ms = makeSwitcher({ launchpad: lp });
    ms.registerBehaviors();
    lp.registeredBehaviors[39].click();
    assert(ms.getPadMode() === 'mute', 'mute click selects mute mode');
})();

// holding mute button calls controller.clearAllMute
(function() {
    var lp = fakeLaunchpad();
    var ctrl = fakeController();
    var ms = makeSwitcher({ launchpad: lp, controller: ctrl });
    ms.registerBehaviors();
    lp.registeredBehaviors[39].hold();
    assert(ctrl.calls.indexOf('clearAllMute') !== -1, 'mute hold clears all mute');
})();

// holding solo button calls controller.clearAllSolo
(function() {
    var lp = fakeLaunchpad();
    var ctrl = fakeController();
    var ms = makeSwitcher({ launchpad: lp, controller: ctrl });
    ms.registerBehaviors();
    lp.registeredBehaviors[29].hold();
    assert(ctrl.calls.indexOf('clearAllSolo') !== -1, 'solo hold clears all solo');
})();

// holding recordArm button calls controller.clearAllArm
(function() {
    var lp = fakeLaunchpad();
    var ctrl = fakeController();
    var ms = makeSwitcher({ launchpad: lp, controller: ctrl });
    ms.registerBehaviors();
    lp.registeredBehaviors[19].hold();
    assert(ctrl.calls.indexOf('clearAllArm') !== -1, 'recordArm hold clears all arm');
})();

// encoder mode buttons have no hold behavior
(function() {
    var lp = fakeLaunchpad();
    var ms = makeSwitcher({ launchpad: lp });
    ms.registerBehaviors();
    assert(lp.registeredBehaviors[89].hold === null, 'volume has no hold');
    assert(lp.registeredBehaviors[79].hold === null, 'pan has no hold');
})();

// selectEncoderMode shows growl notification
(function() {
    var notifications = [];
    var host = { showPopupNotification: function(msg) { notifications.push(msg); } };
    var ms = makeSwitcher();
    ms.host = host;
    ms.selectEncoderMode('pan');
    assert(notifications[0] === 'Encoder: Pan', 'growl for encoder pan mode');
    ms.selectEncoderMode('volume');
    assert(notifications[1] === 'Encoder: Volume', 'growl for encoder volume mode');
})();

// selectPadMode shows growl notification
(function() {
    var notifications = [];
    var host = { showPopupNotification: function(msg) { notifications.push(msg); } };
    var ms = makeSwitcher();
    ms.host = host;
    ms.selectPadMode('mute');
    assert(notifications[0] === 'Pad: Mute', 'growl for pad mute mode');
    ms.selectPadMode('solo');
    assert(notifications[1] === 'Pad: Solo', 'growl for pad solo mode');
    ms.selectPadMode('recordArm');
    assert(notifications[2] === 'Pad: Record Arm', 'growl for pad recordArm mode');
    ms.selectPadMode('sendA');
    assert(notifications[3] === 'Pad: Sends', 'growl for pad sendA mode');
    ms.selectPadMode('select');
    assert(notifications[4] === 'Pad: Select', 'growl for pad select mode');
})();

// double-click recordArm button calls toggleMultiRec via trackPadRelease
(function() {
    var lp = fakeLaunchpad();
    var ctrl = fakeController();
    var ms = makeSwitcher({ launchpad: lp, controller: ctrl });
    ms.registerBehaviors();
    // First click — selects recordArm mode
    lp.registeredBehaviors[19].click();
    assert(ms.getPadMode() === 'recordArm', 'first click selects recordArm');
    // Second click — immediate, detected as double
    lp.registeredBehaviors[19].click();
    assert(ctrl.calls.indexOf('toggleMultiRec') !== -1, 'double-click should call toggleMultiRec');
})();

// slow clicks on recordArm do not toggle multi-rec
(function() {
    var lp = fakeLaunchpad();
    var ctrl = fakeController();
    var ms = makeSwitcher({ launchpad: lp, controller: ctrl });
    ms.registerBehaviors();
    // First click
    lp.registeredBehaviors[19].click();
    // Simulate >400ms delay by resetting click tracking
    lp._clickTracking[19] = { pressTime: null, clickCount: 0, lastClickTime: Date.now() - 500 };
    // Second click after timeout
    lp.registeredBehaviors[19].click();
    assert(ctrl.calls.indexOf('toggleMultiRec') === -1, 'slow re-click should not toggle multi-rec');
    assert(ms.getPadMode() === 'recordArm', 'should still be in recordArm mode');
})();

// recordArm button shows pink when multi-rec is on
(function() {
    var pager = fakePager();
    var lp = fakeLaunchpad();
    var ctrl = fakeController();
    ctrl._multiRec = true;
    var ms = makeSwitcher({ pager: pager, launchpad: lp, controller: ctrl });
    pager.paints.length = 0;
    ms.refresh();
    var recArmPaint = pager.paints.filter(function(p) { return p.pad === 19; });
    assert(recArmPaint.length === 1, 'recordArm button should be painted');
    // pink (53) with dim variant = 52 (from colorVariants)
    assert(recArmPaint[0].color === 52, 'recordArm button should be pink (dim) when multi-rec on');
})();

// recordArm button shows red when multi-rec is off
(function() {
    var pager = fakePager();
    var lp = fakeLaunchpad();
    var ctrl = fakeController();
    ctrl._multiRec = false;
    var ms = makeSwitcher({ pager: pager, launchpad: lp, controller: ctrl });
    pager.paints.length = 0;
    ms.refresh();
    var recArmPaint = pager.paints.filter(function(p) { return p.pad === 19; });
    assert(recArmPaint.length === 1, 'recordArm button should be painted');
    // red (5) with dim variant = 4
    assert(recArmPaint[0].color === 4, 'recordArm button should be red (dim) when multi-rec off');
})();

// first click on recordArm from another mode does not toggle
(function() {
    var lp = fakeLaunchpad();
    var ctrl = fakeController();
    var ms = makeSwitcher({ launchpad: lp, controller: ctrl });
    ms.registerBehaviors();
    ms.selectPadMode('mute'); // switch to different mode
    lp.registeredBehaviors[19].click(); // first click on recordArm from mute
    assert(ctrl.calls.indexOf('toggleMultiRec') === -1, 'first click from another mode should not toggle');
    assert(ms.getPadMode() === 'recordArm', 'should switch to recordArm mode');
})();

// MODE_ENUM static property is accessible
(function() {
    assert(LaunchpadModeSwitcherHW.MODE_ENUM.VOLUME === 'volume', 'MODE_ENUM.VOLUME');
    assert(LaunchpadModeSwitcherHW.MODE_ENUM.RECORD_ARM === 'recordArm', 'MODE_ENUM.RECORD_ARM');
})();

// ---- summary ----

process.exit(t.summary('LaunchpadModeSwitcher'));
