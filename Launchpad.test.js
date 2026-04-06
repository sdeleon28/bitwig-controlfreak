var LaunchpadHW = require('./Launchpad');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeMidiOutput() {
    var msgs = [];
    return {
        messages: msgs,
        sendMidi: function(status, data1, data2) {
            msgs.push({ status: status, data1: data1, data2: data2 });
        },
        sendSysex: function(data) {
            msgs.push({ sysex: data });
        }
    };
}

function fakeTrack(opts) {
    opts = opts || {};
    return {
        name: function() { return { get: function() { return opts.name || 'Track'; } }; },
        volume: function() { return { get: function() { return opts.volume || 0; } }; },
        pan: function() { return { get: function() { return opts.pan || 0.5; } }; },
        color: function() {
            return {
                red: function() { return (opts.r || 0) / 255; },
                green: function() { return (opts.g || 0) / 255; },
                blue: function() { return (opts.b || 0) / 255; }
            };
        },
        mute: function() { return { get: function() { return !!opts.muted; } }; },
        solo: function() { return { get: function() { return !!opts.soloed; } }; },
        arm: function() { return { get: function() { return !!opts.armed; } }; }
    };
}

function fakeBitwig(tracks) {
    tracks = tracks || {};
    return {
        getTrack: function(id) { return tracks[id] || null; }
    };
}

function fakePager() {
    var paints = [];
    return {
        paints: paints,
        activePage: 1,
        requestPaint: function(page, pad, color) { paints.push({ page: page, pad: pad, color: color }); },
        getActivePage: function() { return this.activePage; }
    };
}

function fakeModeSwitcher(padMode) {
    return {
        getPadMode: function() { return padMode || 'mute'; }
    };
}

function fakeHost() {
    var tasks = [];
    return {
        tasks: tasks,
        scheduleTask: function(fn, _arg, delay) { tasks.push({ fn: fn, delay: delay }); }
    };
}

function makeLaunchpad(opts) {
    opts = opts || {};
    return new LaunchpadHW({
        midiOutput: opts.midiOutput || fakeMidiOutput(),
        pager: opts.pager || fakePager(),
        bitwig: opts.bitwig || fakeBitwig(),
        launchpadModeSwitcher: opts.launchpadModeSwitcher || fakeModeSwitcher(),
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// setPadColor sends note-on (0x90) with correct color value
(function() {
    var out = fakeMidiOutput();
    var lp = makeLaunchpad({ midiOutput: out });
    lp.setPadColor(44, 21);
    assert(out.messages.length === 1, 'one message sent');
    assert(out.messages[0].status === 0x90, 'status is 0x90');
    assert(out.messages[0].data1 === 44, 'pad number is 44');
    assert(out.messages[0].data2 === 21, 'color value is 21 (green)');
})();

// setPadColor with string color name resolves to value
(function() {
    var out = fakeMidiOutput();
    var lp = makeLaunchpad({ midiOutput: out });
    lp.setPadColor(44, 'green');
    assert(out.messages[0].data2 === 21, 'string "green" resolves to 21');
})();

// setPadColorFlashing sends on channel 2 (0x91)
(function() {
    var out = fakeMidiOutput();
    var lp = makeLaunchpad({ midiOutput: out });
    lp.setPadColorFlashing(44, 21);
    var flashMsg = out.messages.find(function(m) { return m.status === 0x91; });
    assert(flashMsg !== undefined, 'flashing message sent on 0x91');
    assert(flashMsg.data2 === 21, 'flash color is 21');
})();

// setPadColorPulsing sends on channel 3 (0x92)
(function() {
    var out = fakeMidiOutput();
    var lp = makeLaunchpad({ midiOutput: out });
    lp.setPadColorPulsing(44, 21);
    assert(out.messages[0].status === 0x92, 'pulsing message on 0x92');
    assert(out.messages[0].data2 === 21, 'pulse color is 21');
})();

// setTopButtonColor sends CC message (0xB0)
(function() {
    var out = fakeMidiOutput();
    var lp = makeLaunchpad({ midiOutput: out });
    lp.setTopButtonColor(104, 45);
    assert(out.messages[0].status === 0xB0, 'top button sends CC 0xB0');
    assert(out.messages[0].data1 === 104, 'CC number is 104');
    assert(out.messages[0].data2 === 45, 'color is 45 (blue)');
})();

// clearPad sends color 0
(function() {
    var out = fakeMidiOutput();
    var lp = makeLaunchpad({ midiOutput: out });
    lp.clearPad(44);
    assert(out.messages[0].data2 === 0, 'clearPad sends color 0');
})();

// bitwigColorToLaunchpad exact palette mapping
(function() {
    var lp = makeLaunchpad();
    // Exact matches from Bitwig palette (float RGB)
    assert(lp.bitwigColorToLaunchpad(0.8510, 0.1804, 0.1333) === 72, 'red exact');
    assert(lp.bitwigColorToLaunchpad(0.0000, 0.6157, 0.2706) === 87, 'green exact');
    assert(lp.bitwigColorToLaunchpad(0.0000, 0.6000, 0.8431) === 79, 'blue exact');
    assert(lp.bitwigColorToLaunchpad(0.8510, 0.6157, 0.0549) === 99, 'gold exact');
    assert(lp.bitwigColorToLaunchpad(0.5843, 0.2863, 0.7961) === 81, 'purple exact');
    assert(lp.bitwigColorToLaunchpad(0.0000, 0.6510, 0.5725) === 34, 'teal exact');
    // Nearest-color fallback for unknown colors
    assert(typeof lp.bitwigColorToLaunchpad(0.5, 0.5, 0.5) === 'number', 'fallback returns a number');
})();

// getBrightnessVariant returns correct variant / falls back to base
(function() {
    var lp = makeLaunchpad();
    assert(lp.getBrightnessVariant(21, 'dim') === 23, 'green dim = 23');
    assert(lp.getBrightnessVariant(21, 'bright') === 19, 'green bright = 19');
    assert(lp.getBrightnessVariant(99, 'dim') === 99, 'unknown color falls back to base');
    assert(lp.getBrightnessVariant(21, null) === 21, 'null brightness returns base');
})();

// registerPadBehavior + handlePadPress + handlePadRelease triggers click callback
(function() {
    var pager = fakePager();
    pager.activePage = 1;
    var lp = makeLaunchpad({ pager: pager });
    var clicked = false;
    lp.registerPadBehavior(44, function() { clicked = true; }, null, 1);
    lp.handlePadPress(44);
    lp.handlePadRelease(44);
    assert(clicked, 'click callback triggered on short press');
})();

// registerPadBehavior + long press triggers hold callback
(function() {
    var pager = fakePager();
    pager.activePage = 1;
    var lp = makeLaunchpad({ pager: pager });
    var held = false;
    lp.registerPadBehavior(44, function() {}, function() { held = true; }, 1);

    // Simulate: press, then set pressTime to long ago, then release
    lp.handlePadPress(44);
    lp._padTimers[44].pressTime = Date.now() - 500;  // 500ms > 400ms hold threshold
    lp.handlePadRelease(44);
    assert(held, 'hold callback triggered on long press');
})();

// page-aware behavior: behavior on wrong page returns false
(function() {
    var pager = fakePager();
    pager.activePage = 2;
    var lp = makeLaunchpad({ pager: pager });
    var clicked = false;
    lp.registerPadBehavior(44, function() { clicked = true; }, null, 1);
    var result = lp.handlePadPress(44);
    assert(result === false, 'handlePadPress returns false on wrong page');
    assert(!clicked, 'click callback not triggered on wrong page');
})();

// multi-click: trackPadPress + trackPadRelease detects double click
(function() {
    var lp = makeLaunchpad();
    lp.trackPadPress(44);
    var r1 = lp.trackPadRelease(44);
    assert(r1 === null, 'first click returns null');

    // Simulate second click within threshold
    lp._clickTracking[44].lastClickTime = Date.now();
    lp.trackPadPress(44);
    var r2 = lp.trackPadRelease(44);
    assert(r2 === 'double', 'second click returns "double"');
})();

// linkPadToTrack stores link and paints via pager
(function() {
    var pager = fakePager();
    var track = fakeTrack({ r: 255, g: 0, b: 0 });
    var bw = fakeBitwig({ 0: track });
    var ms = fakeModeSwitcher('mute');
    var lp = makeLaunchpad({ pager: pager, bitwig: bw, launchpadModeSwitcher: ms });

    lp.linkPadToTrack(44, 0, 1);
    assert(lp.getPadForTrack(0) === 44, 'track 0 maps to pad 44');
    assert(pager.paints.length > 0, 'pager.requestPaint called');
    assert(pager.paints[0].pad === 44, 'painted pad 44');
})();

// unlinkPad clears link and pad
(function() {
    var out = fakeMidiOutput();
    var pager = fakePager();
    var track = fakeTrack();
    var bw = fakeBitwig({ 0: track });
    var ms = fakeModeSwitcher();
    var lp = makeLaunchpad({ midiOutput: out, pager: pager, bitwig: bw, launchpadModeSwitcher: ms });

    lp.linkPadToTrack(44, 0, 1);
    out.messages.length = 0;
    lp.unlinkPad(44);
    assert(lp.getPadForTrack(0) === null, 'track 0 unlinked');
    var clearMsg = out.messages.find(function(m) { return m.status === 0x90 && m.data2 === 0; });
    assert(clearMsg !== undefined, 'pad cleared after unlink');
})();

// getTrackGridPadColor returns mode-appropriate color
(function() {
    var mutedTrack = fakeTrack({ muted: true, r: 255, g: 0, b: 0 });
    var soloedTrack = fakeTrack({ soloed: true, r: 0, g: 255, b: 0 });
    var armedTrack = fakeTrack({ armed: true, r: 0, g: 0, b: 255 });
    var normalTrack = fakeTrack({ r: 255, g: 0, b: 0 });

    // Mute mode
    var lp1 = makeLaunchpad({ bitwig: fakeBitwig({ 0: mutedTrack }), launchpadModeSwitcher: fakeModeSwitcher('mute') });
    var muteColor = lp1.getTrackGridPadColor(0);
    assert(muteColor === 9, 'muted track returns mute color 9');

    // Solo mode
    var lp2 = makeLaunchpad({ bitwig: fakeBitwig({ 0: soloedTrack }), launchpadModeSwitcher: fakeModeSwitcher('solo') });
    var soloColor = lp2.getTrackGridPadColor(0);
    assert(soloColor === 124, 'soloed track returns solo color 124');

    // Arm mode
    var lp3 = makeLaunchpad({ bitwig: fakeBitwig({ 0: armedTrack }), launchpadModeSwitcher: fakeModeSwitcher('recordArm') });
    var armColor = lp3.getTrackGridPadColor(0);
    assert(armColor === 121, 'armed track returns rec arm color 121');

    // Default mode (not muted/soloed/armed)
    var lp4 = makeLaunchpad({ bitwig: fakeBitwig({ 0: normalTrack }), launchpadModeSwitcher: fakeModeSwitcher('mute') });
    var defaultColor = lp4.getTrackGridPadColor(0);
    var expectedColor = lp4.getBrightnessVariant(lp4.bitwigColorToLaunchpad(1, 0, 0), 'bright');
    assert(defaultColor === expectedColor, 'non-muted track in mute mode returns dim track color');
})();

// enterProgrammerMode sends correct SysEx
(function() {
    var out = fakeMidiOutput();
    var lp = makeLaunchpad({ midiOutput: out });
    lp.enterProgrammerMode();
    var sysexMsg = out.messages.find(function(m) { return m.sysex !== undefined; });
    assert(sysexMsg !== undefined, 'sysex message sent');
    assert(sysexMsg.sysex.indexOf('01') !== -1, 'programmer mode sysex contains 01');
})();

// no output does not throw
(function() {
    var lp = new LaunchpadHW({ debug: false, println: function() {} });
    lp.setPadColor(44, 21);
    lp.setPadColorFlashing(44, 21);
    lp.setPadColorPulsing(44, 21);
    lp.clearAll();
    lp.enterProgrammerMode();
    assert(true, 'no output does not throw');
})();

// static constants match instance constants
(function() {
    assert(LaunchpadHW.COLORS.green === 21, 'static COLORS.green = 21');
    assert(LaunchpadHW.BUTTONS.top1 === 104, 'static BUTTONS.top1 = 104');
    assert(LaunchpadHW.BRIGHTNESS.dim === 'dim', 'static BRIGHTNESS.dim');
    assert(LaunchpadHW.HOLD_TIMING.hold === 400, 'static HOLD_TIMING.hold = 400');

    var lp = makeLaunchpad();
    assert(lp.colors.green === LaunchpadHW.COLORS.green, 'instance colors match static');
    assert(lp.buttons.top1 === LaunchpadHW.BUTTONS.top1, 'instance buttons match static');
})();

// resetClickTracking is public
(function() {
    var lp = makeLaunchpad();
    lp.trackPadPress(44);
    lp.trackPadRelease(44);
    lp.resetClickTracking(44);
    assert(lp._clickTracking[44].clickCount === 0, 'click count reset to 0');
})();

// clearPadBehavior removes behavior for a single pad
(function() {
    var lp = makeLaunchpad();
    lp.registerPadBehavior(44, function() {}, null, 1);
    lp.registerPadBehavior(45, function() {}, null, 1);
    lp.clearPadBehavior(44);
    assert(!lp._padTimers[44], 'cleared pad should have no behavior');
    assert(lp._padTimers[45], 'other pad should still have behavior');
})();

// ---- note pad tests ----

// registerNotePad + handleNotePadPress fires onPress immediately
(function() {
    var pager = fakePager();
    pager.activePage = 1;
    var lp = makeLaunchpad({ pager: pager });
    var pressed = false;
    lp.registerNotePad(44, function() { pressed = true; }, null, 1);
    var result = lp.handleNotePadPress(44);
    assert(result === true, 'handleNotePadPress should return true');
    assert(pressed, 'onPress should fire immediately on press');
})();

// handleNotePadRelease fires onRelease
(function() {
    var pager = fakePager();
    pager.activePage = 1;
    var lp = makeLaunchpad({ pager: pager });
    var released = false;
    lp.registerNotePad(44, function() {}, function() { released = true; }, 1);
    lp.handleNotePadRelease(44);
    assert(released, 'onRelease should fire on release');
})();

// handleNotePadPress returns false for unregistered pad
(function() {
    var lp = makeLaunchpad();
    var result = lp.handleNotePadPress(99);
    assert(result === false, 'should return false for unregistered pad');
})();

// handleNotePadRelease returns false for unregistered pad
(function() {
    var lp = makeLaunchpad();
    var result = lp.handleNotePadRelease(99);
    assert(result === false, 'should return false for unregistered pad');
})();

// note pad on wrong page returns false
(function() {
    var pager = fakePager();
    pager.activePage = 2;
    var lp = makeLaunchpad({ pager: pager });
    var pressed = false;
    lp.registerNotePad(44, function() { pressed = true; }, null, 1);
    var result = lp.handleNotePadPress(44);
    assert(result === false, 'should return false on wrong page');
    assert(!pressed, 'onPress should not fire on wrong page');
})();

// clearNotePad removes note pad handler
(function() {
    var pager = fakePager();
    pager.activePage = 1;
    var lp = makeLaunchpad({ pager: pager });
    lp.registerNotePad(44, function() {}, null, 1);
    lp.clearNotePad(44);
    var result = lp.handleNotePadPress(44);
    assert(result === false, 'cleared note pad should return false');
})();

// clearPadBehavior also clears note pads
(function() {
    var pager = fakePager();
    pager.activePage = 1;
    var lp = makeLaunchpad({ pager: pager });
    lp.registerNotePad(44, function() {}, null, 1);
    lp.clearPadBehavior(44);
    var result = lp.handleNotePadPress(44);
    assert(result === false, 'clearPadBehavior should also clear note pads');
})();

// clearAllPadBehaviors also clears all note pads
(function() {
    var pager = fakePager();
    pager.activePage = 1;
    var lp = makeLaunchpad({ pager: pager });
    lp.registerNotePad(44, function() {}, null, 1);
    lp.registerNotePad(45, function() {}, null, 1);
    lp.clearAllPadBehaviors();
    assert(lp.handleNotePadPress(44) === false, 'should clear note pad 44');
    assert(lp.handleNotePadPress(45) === false, 'should clear note pad 45');
})();

// note pad with null pageNumber works on any page
(function() {
    var pager = fakePager();
    pager.activePage = 5;
    var lp = makeLaunchpad({ pager: pager });
    var pressed = false;
    lp.registerNotePad(44, function() { pressed = true; }, null, null);
    var result = lp.handleNotePadPress(44);
    assert(result === true, 'null pageNumber should work on any page');
    assert(pressed, 'onPress should fire');
})();

// ---- summary ----

process.exit(t.summary('Launchpad'));
