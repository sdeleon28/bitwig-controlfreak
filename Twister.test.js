var TwisterHW = require('./Twister');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeMidiOutput() {
    var msgs = [];
    return {
        messages: msgs,
        sendMidi: function(status, data1, data2) {
            msgs.push({ status: status, data1: data1, data2: data2 });
        }
    };
}

function fakeTrack(opts) {
    opts = opts || {};
    var vol = opts.volume || 0;
    var pan = opts.pan || 0.5;
    var r = opts.r || 0;
    var g = opts.g || 0;
    var b = opts.b || 0;
    var trackName = opts.name || 'Track';
    var isMuted = opts.muted || false;
    var isSoloed = opts.soloed || false;
    var isArmed = opts.armed || false;
    return {
        name: function() { return { get: function() { return trackName; } }; },
        volume: function() { return { get: function() { return vol; }, set: function(v) { vol = v; } }; },
        pan: function() { return { get: function() { return pan; }, set: function(v) { pan = v; } }; },
        color: function() {
            return {
                red: function() { return r / 255; },
                green: function() { return g / 255; },
                blue: function() { return b / 255; }
            };
        },
        mute: function() { return { get: function() { return isMuted; }, toggle: function() { isMuted = !isMuted; } }; },
        solo: function() { return { get: function() { return isSoloed; }, set: function(v) { isSoloed = v; } }; },
        arm: function() { return { get: function() { return isArmed; }, set: function(v) { isArmed = v; } }; },
        sendBank: function() {
            return {
                getItemAt: function(i) {
                    var sendVal = 0;
                    return { value: function() { return { get: function() { return sendVal; }, set: function(v) { sendVal = v; } }; } };
                }
            };
        }
    };
}

function fakeBitwig(tracks) {
    tracks = tracks || {};
    return {
        getTrack: function(id) { return tracks[id] || null; },
        getFxTracks: function() { return []; },
        getRemoteControls: function() { return null; }
    };
}

function fakeModeSwitcher(encoderMode, padMode) {
    return {
        getEncoderMode: function() { return encoderMode || 'volume'; },
        getPadMode: function() { return padMode || 'mute'; }
    };
}

function fakeHost() {
    var notifications = [];
    return {
        notifications: notifications,
        showPopupNotification: function(msg) { notifications.push(msg); }
    };
}

function makeTwister(opts) {
    opts = opts || {};
    return new TwisterHW({
        midiOutput: opts.midiOutput || fakeMidiOutput(),
        bitwig: opts.bitwig || fakeBitwig(),
        launchpadModeSwitcher: opts.launchpadModeSwitcher || fakeModeSwitcher(),
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// encoderToCC / ccToEncoder roundtrip
(function() {
    var tw = makeTwister();
    for (var enc = 1; enc <= 16; enc++) {
        var cc = tw.encoderToCC(enc);
        var back = tw.ccToEncoder(cc);
        assert(back === enc, 'roundtrip encoder ' + enc + ' -> CC ' + cc + ' -> encoder ' + back);
    }
})();

// encoderToCC maps bottom-left (encoder 1) to CC 12
(function() {
    var tw = makeTwister();
    assert(tw.encoderToCC(1) === 12, 'encoder 1 maps to CC 12');
    assert(tw.encoderToCC(5) === 8, 'encoder 5 maps to CC 8');
    assert(tw.encoderToCC(13) === 0, 'encoder 13 maps to CC 0');
})();

// linkEncoderToTrack sends LED and color MIDI, stores link
(function() {
    var out = fakeMidiOutput();
    var track = fakeTrack({ volume: 0.5, r: 255, g: 0, b: 0, name: 'Bass (1)' });
    var bw = fakeBitwig({ 0: track });
    var tw = makeTwister({ midiOutput: out, bitwig: bw });

    tw.linkEncoderToTrack(1, 0);

    assert(tw.getEncoderLink(1) !== null, 'encoder 1 is linked');
    assert(tw.getEncoderLink(1).trackId === 0, 'encoder 1 linked to track 0');
    assert(tw.getEncoderForTrack(0) === 1, 'track 0 maps to encoder 1');

    // Should have sent LED (volume=0.5 -> 64) and color messages
    var ledMsgs = out.messages.filter(function(m) { return m.status === 0xB0; });
    assert(ledMsgs.length > 0, 'LED message sent');
    // Last LED message should be the volume sync (first may be from unlinkEncoder clear)
    var ledMsg = ledMsgs[ledMsgs.length - 1];
    assert(ledMsg.data2 === Math.round(0.5 * 127), 'LED value matches volume 0.5, got ' + ledMsg.data2);

    var colorMsg = out.messages.find(function(m) { return m.status === 0xB1; });
    assert(colorMsg !== undefined, 'color message sent');
})();

// unlinkEncoder clears LED and removes link
(function() {
    var out = fakeMidiOutput();
    var track = fakeTrack({ volume: 0.5 });
    var bw = fakeBitwig({ 0: track });
    var tw = makeTwister({ midiOutput: out, bitwig: bw });

    tw.linkEncoderToTrack(1, 0);
    out.messages.length = 0;

    tw.unlinkEncoder(1);
    assert(tw.getEncoderLink(1) === null, 'encoder 1 is unlinked');
    assert(tw.getEncoderForTrack(0) === null, 'track 0 has no encoder');

    // Should have sent clear messages (LED=0 and color=0)
    var ledClear = out.messages.find(function(m) { return m.status === 0xB0 && m.data2 === 0; });
    assert(ledClear !== undefined, 'LED cleared to 0');
})();

// unlinkAll resets all state
(function() {
    var out = fakeMidiOutput();
    var track1 = fakeTrack({ volume: 0.3 });
    var track2 = fakeTrack({ volume: 0.7 });
    var bw = fakeBitwig({ 0: track1, 1: track2 });
    var tw = makeTwister({ midiOutput: out, bitwig: bw });

    tw.linkEncoderToTrack(1, 0);
    tw.linkEncoderToTrack(2, 1);
    tw.unlinkAll();

    assert(tw.getEncoderLink(1) === null, 'encoder 1 cleared after unlinkAll');
    assert(tw.getEncoderLink(2) === null, 'encoder 2 cleared after unlinkAll');
    assert(tw.getEncoderForTrack(0) === null, 'track 0 cleared after unlinkAll');
    assert(tw.getEncoderForTrack(1) === null, 'track 1 cleared after unlinkAll');
})();

// handleEncoderTurn in volume mode sets track.volume
(function() {
    var track = fakeTrack({ volume: 0 });
    var bw = fakeBitwig({ 0: track });
    var ms = fakeModeSwitcher('volume');
    var tw = makeTwister({ bitwig: bw, launchpadModeSwitcher: ms });

    tw.linkEncoderToTrack(1, 0);
    tw.handleEncoderTurn(1, 100);

    var vol = track.volume().get();
    assert(Math.abs(vol - 100 / 127) < 0.01, 'volume set to ~0.787, got ' + vol);
})();

// handleEncoderTurn in pan mode sets track.pan
(function() {
    var track = fakeTrack({ volume: 0, pan: 0.5 });
    var bw = fakeBitwig({ 0: track });
    var ms = fakeModeSwitcher('pan');
    var tw = makeTwister({ bitwig: bw, launchpadModeSwitcher: ms });

    tw.linkEncoderToTrack(1, 0);
    tw.handleEncoderTurn(1, 64);

    var pan = track.pan().get();
    assert(Math.abs(pan - 64 / 127) < 0.01, 'pan set to ~0.504, got ' + pan);
})();

// handleEncoderTurn with custom behavior calls turnCallback
(function() {
    var tw = makeTwister();
    var receivedValue = null;
    tw.linkEncoderToBehavior(5, function(v) { receivedValue = v; }, null, null);
    tw.handleEncoderTurn(5, 42);
    assert(receivedValue === 42, 'custom turn callback received value 42, got ' + receivedValue);
})();

// handleEncoderPress calls track.solo and host notification
(function() {
    var track = fakeTrack({ name: 'Drums' });
    var bw = fakeBitwig({ 0: track });
    var h = fakeHost();
    var tw = makeTwister({ bitwig: bw, host: h });

    tw.linkEncoderToTrack(1, 0);
    tw.handleEncoderPress(1, true);

    assert(track.solo().get() === true, 'track soloed on press');
    assert(h.notifications.length === 1, 'notification shown');
    assert(h.notifications[0].indexOf('Drums') !== -1, 'notification contains track name');

    tw.handleEncoderPress(1, false);
    assert(track.solo().get() === false, 'track unsoloed on release');
})();

// handleEncoderPress with custom behavior calls pressCallback
(function() {
    var tw = makeTwister();
    var pressedState = null;
    tw.linkEncoderToBehavior(3, null, function(p) { pressedState = p; }, null);
    tw.handleEncoderPress(3, true);
    assert(pressedState === true, 'custom press callback received true');
    tw.handleEncoderPress(3, false);
    assert(pressedState === false, 'custom press callback received false');
})();

// findClosestColorIndex: grayscale detection
(function() {
    var tw = makeTwister();
    assert(tw.findClosestColorIndex(128, 128, 128) === 0, 'gray returns 0');
    assert(tw.findClosestColorIndex(0, 0, 0) === 0, 'black returns 0');
    assert(tw.findClosestColorIndex(255, 255, 255) === 0, 'white returns 0');
})();

// findClosestColorIndex: pure red returns non-zero
(function() {
    var tw = makeTwister();
    var idx = tw.findClosestColorIndex(255, 0, 0);
    assert(idx > 0, 'pure red returns non-zero index: ' + idx);
})();

// findClosestColorIndex: purple detection (hue 270-330)
(function() {
    var tw = makeTwister();
    var idx = tw.findClosestColorIndex(150, 0, 255);
    assert(idx >= 105 && idx <= 120, 'purple maps to 105-120 range, got ' + idx);
})();

// refreshEncoderLEDsForVolume syncs all linked encoder LEDs
(function() {
    var out = fakeMidiOutput();
    var track = fakeTrack({ volume: 0.75 });
    var bw = fakeBitwig({ 0: track });
    var tw = makeTwister({ midiOutput: out, bitwig: bw });

    tw.linkEncoderToTrack(1, 0);
    out.messages.length = 0;

    tw.refreshEncoderLEDsForVolume();
    var ledMsg = out.messages.find(function(m) { return m.status === 0xB0; });
    assert(ledMsg !== undefined, 'LED message sent during refresh');
    assert(ledMsg.data2 === Math.round(0.75 * 127), 'LED value matches volume');
})();

// getters return null for missing entries
(function() {
    var tw = makeTwister();
    assert(tw.getEncoderForTrack(99) === null, 'missing track returns null');
    assert(tw.getEncoderForSend(99, 0) === null, 'missing send returns null');
    assert(tw.getEncoderForEffectTrack(99) === null, 'missing effect track returns null');
    assert(tw.getEncoderLink(99) === null, 'missing encoder link returns null');
})();

// setEncoderBrightness sends on channel 2 (0xB2)
(function() {
    var out = fakeMidiOutput();
    var tw = makeTwister({ midiOutput: out });
    tw.setEncoderBrightness(1, 47);
    var msg = out.messages.find(function(m) { return m.status === 0xB2; });
    assert(msg !== undefined, 'brightness message sent on 0xB2');
    assert(msg.data1 === tw.encoderToCC(1), 'brightness targets correct CC');
    assert(msg.data2 === 47, 'brightness value is 47 (max)');
})();

// setEncoderOff sends brightness 17 (off)
(function() {
    var out = fakeMidiOutput();
    var tw = makeTwister({ midiOutput: out });
    tw.setEncoderOff(1);
    var msg = out.messages.find(function(m) { return m.status === 0xB2; });
    assert(msg !== undefined, 'off message sent on 0xB2');
    assert(msg.data2 === 17, 'off brightness value is 17');
})();

// setEncoderBrightness does not throw without output
(function() {
    var tw = new TwisterHW({ debug: false, println: function() {} });
    tw.setEncoderBrightness(1, 47);  // should not throw
    assert(true, 'setEncoderBrightness does not throw without output');
})();

// setEncoderColor also sends brightness 47 to ensure visibility
(function() {
    var out = fakeMidiOutput();
    var tw = makeTwister({ midiOutput: out });
    tw.setEncoderColor(1, 255, 0, 0);
    var colorMsg = out.messages.find(function(m) { return m.status === 0xB1; });
    assert(colorMsg !== undefined, 'color message sent on 0xB1');
    var brightMsg = out.messages.find(function(m) { return m.status === 0xB2; });
    assert(brightMsg !== undefined, 'brightness message sent on 0xB2 with color');
    assert(brightMsg.data1 === tw.encoderToCC(1), 'brightness targets correct CC');
    assert(brightMsg.data2 === 47, 'brightness set to max (47) with color');
})();

// no output does not throw
(function() {
    var tw = new TwisterHW({ debug: false, println: function() {} });
    tw.setEncoderLED(1, 64);  // should not throw
    tw.setEncoderColor(1, 255, 0, 0);  // should not throw
    assert(true, 'no output does not throw');
})();

// ---- summary ----

process.exit(t.summary('Twister'));
