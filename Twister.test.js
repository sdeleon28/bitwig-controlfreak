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
    var visibleCalls = 0;
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
        makeVisibleInArranger: function() { visibleCalls++; },
        _getVisibleCalls: function() { return visibleCalls; },
        sendBank: function() {
            return {
                getItemAt: function(i) {
                    var sendVal = 0;
                    var sendName = (opts.sendNames && opts.sendNames[i]) || ('Send ' + (i + 1));
                    return {
                        name: function() { return { get: function() { return sendName; } }; },
                        value: function() { return { get: function() { return sendVal; }, set: function(v) { sendVal = v; } }; }
                    };
                }
            };
        }
    };
}

function fakeBitwig(tracks, opts) {
    tracks = tracks || {};
    opts = opts || {};
    var cachedRC = null;
    return {
        getTrack: function(id) { return tracks[id] || null; },
        getFxTracks: function() { return []; },
        getRemoteControls: function() {
            if (!opts.remoteControls) return null;
            if (cachedRC) return cachedRC;
            var names = opts.remoteControls;
            var values = opts.remoteControlValues || [];
            var discreteValueCounts = opts.discreteValueCounts || [];
            var params = {};
            for (var i = 0; i < 8; i++) {
                (function(idx) {
                    var val = values[idx] !== undefined ? values[idx] : 0;
                    var stepCount = discreteValueCounts[idx] !== undefined ? discreteValueCounts[idx] : -1;
                    params[idx] = {
                        name: function() { return { get: function() { return names[idx] || ""; } }; },
                        value: function() { return { get: function() { return val; }, set: function(v) { val = v; } }; },
                        discreteValueCount: function() { return { get: function() { return stepCount; } }; }
                    };
                })(i);
            }
            cachedRC = { getParameter: function(i) { return params[i]; } };
            return cachedRC;
        }
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

// linkEncodersToRemoteControls falls back to red when no cursor track color
(function() {
    var out = fakeMidiOutput();
    var bw = fakeBitwig({}, { remoteControls: ['Cutoff', 'Resonance', '', '', '', '', '', ''] });
    var tw = makeTwister({ midiOutput: out, bitwig: bw });
    out.messages.length = 0;
    tw.linkEncodersToRemoteControls();
    var redIndex = tw.findClosestColorIndex(255, 0, 0);
    var redColorMsgs = out.messages.filter(function(m) { return m.status === 0xB1 && m.data2 === redIndex; });
    assert(redColorMsgs.length === 8, "should send 8 red color messages (fallback), got " + redColorMsgs.length);
})();

// findClosestColorIndex: pure blue (0,0,255) maps to index 0 (known edge case)
(function() {
    var tw = makeTwister();
    var idx = tw.findClosestColorIndex(0, 0, 255);
    assert(idx === 0, 'pure blue (0,0,255) maps to index 0 (edge case), got ' + idx);
})();

// findClosestColorIndex: shifted blue (0,50,255) returns visible non-zero index
(function() {
    var tw = makeTwister();
    var idx = tw.findClosestColorIndex(0, 50, 255);
    assert(idx > 0, 'shifted blue (0,50,255) should return non-zero index, got ' + idx);
})();

// toggle param (stepCount=2) maps to press behavior, not turn
(function() {
    var out = fakeMidiOutput();
    var bw = fakeBitwig({}, {
        remoteControls: ['Use 16ths', '', '', '', '', '', '', ''],
        discreteValueCounts: [2, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ midiOutput: out, bitwig: bw });
    tw.linkEncodersToRemoteControls();
    // Param 0 maps to encoder ((0+4)%8)+1 = 5
    var behavior = tw._encoderBehaviors[5];
    assert(behavior !== undefined, 'toggle param should create a behavior on encoder 5');
    assert(behavior.pressCallback !== null, 'toggle param should have a press callback');
    assert(behavior.turnCallback === null, 'toggle param should NOT have a turn callback');
})();

// pressing toggle encoder toggles value between 0 and 1
(function() {
    var bw = fakeBitwig({}, {
        remoteControls: ['Toggle', '', '', '', '', '', '', ''],
        remoteControlValues: [0, 0, 0, 0, 0, 0, 0, 0],
        discreteValueCounts: [2, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToRemoteControls();
    var behavior = tw._encoderBehaviors[5];
    // Press to toggle on
    behavior.pressCallback(true);
    var param = bw.getRemoteControls().getParameter(0);
    assert(param.value().get() === 1, 'pressing toggle should set value to 1, got ' + param.value().get());
    // Press to toggle off
    behavior.pressCallback(true);
    assert(param.value().get() === 0, 'pressing again should set value to 0, got ' + param.value().get());
})();

// pressing toggle encoder with pressed=false is ignored
(function() {
    var bw = fakeBitwig({}, {
        remoteControls: ['Toggle', '', '', '', '', '', '', ''],
        remoteControlValues: [0, 0, 0, 0, 0, 0, 0, 0],
        discreteValueCounts: [2, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToRemoteControls();
    var behavior = tw._encoderBehaviors[5];
    behavior.pressCallback(false);
    var param = bw.getRemoteControls().getParameter(0);
    assert(param.value().get() === 0, 'release should be ignored, value should stay 0');
})();

// toggle LED is binary (0 or 127)
(function() {
    var out = fakeMidiOutput();
    var bw = fakeBitwig({}, {
        remoteControls: ['Toggle', '', '', '', '', '', '', ''],
        remoteControlValues: [0.8, 0, 0, 0, 0, 0, 0, 0],
        discreteValueCounts: [2, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ midiOutput: out, bitwig: bw });
    tw.linkEncodersToRemoteControls();
    // Encoder 5, CC = encoderToCC(5) = 8
    var cc = tw.encoderToCC(5);
    var ledMsgs = out.messages.filter(function(m) { return m.status === 0xB0 && m.data1 === cc; });
    var lastLed = ledMsgs[ledMsgs.length - 1];
    assert(lastLed.data2 === 127, 'toggle LED should be 127 when value >= 0.5, got ' + lastLed.data2);
})();

// toggle LED is 0 when value < 0.5
(function() {
    var out = fakeMidiOutput();
    var bw = fakeBitwig({}, {
        remoteControls: ['Toggle', '', '', '', '', '', '', ''],
        remoteControlValues: [0.3, 0, 0, 0, 0, 0, 0, 0],
        discreteValueCounts: [2, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ midiOutput: out, bitwig: bw });
    tw.linkEncodersToRemoteControls();
    var cc = tw.encoderToCC(5);
    var ledMsgs = out.messages.filter(function(m) { return m.status === 0xB0 && m.data1 === cc; });
    var lastLed = ledMsgs[ledMsgs.length - 1];
    assert(lastLed.data2 === 0, 'toggle LED should be 0 when value < 0.5, got ' + lastLed.data2);
})();

// continuous param (stepCount=-1) maps to turn + press (growl) behavior
(function() {
    var bw = fakeBitwig({}, {
        remoteControls: ['Cutoff', '', '', '', '', '', '', ''],
        discreteValueCounts: [-1, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToRemoteControls();
    var behavior = tw._encoderBehaviors[5];
    assert(behavior !== undefined, 'continuous param should create a behavior');
    assert(behavior.turnCallback !== null, 'continuous param should have a turn callback');
    assert(behavior.pressCallback !== null, 'continuous param should have a press callback (growl)');
})();

// continuous param turn callback sets value
(function() {
    var bw = fakeBitwig({}, {
        remoteControls: ['Cutoff', '', '', '', '', '', '', ''],
        remoteControlValues: [0, 0, 0, 0, 0, 0, 0, 0],
        discreteValueCounts: [-1, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToRemoteControls();
    var behavior = tw._encoderBehaviors[5];
    behavior.turnCallback(100);
    var param = bw.getRemoteControls().getParameter(0);
    assert(Math.abs(param.value().get() - 100/127) < 0.01, 'turn should set value to ~0.787');
})();

// multi-step param (stepCount=4) maps to turn behavior
(function() {
    var bw = fakeBitwig({}, {
        remoteControls: ['Mode', '', '', '', '', '', '', ''],
        discreteValueCounts: [4, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToRemoteControls();
    var behavior = tw._encoderBehaviors[5];
    assert(behavior !== undefined, 'multi-step param should create a behavior');
    assert(behavior.turnCallback !== null, 'multi-step param should have a turn callback');
})();

// updateRemoteControlLED uses binary LED for toggles
(function() {
    var out = fakeMidiOutput();
    var bw = fakeBitwig({}, {
        remoteControls: ['Toggle', 'Knob', '', '', '', '', '', ''],
        remoteControlValues: [0, 0, 0, 0, 0, 0, 0, 0],
        discreteValueCounts: [2, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ midiOutput: out, bitwig: bw });
    tw.linkEncodersToRemoteControls();
    out.messages.length = 0;
    // Update toggle param (index 0) with value 0.8 → should be binary 127
    tw.updateRemoteControlLED(0, 0.8);
    var cc5 = tw.encoderToCC(5);
    var ledMsgs = out.messages.filter(function(m) { return m.status === 0xB0 && m.data1 === cc5; });
    assert(ledMsgs[0].data2 === 127, 'toggle LED update should be binary 127, got ' + ledMsgs[0].data2);
    out.messages.length = 0;
    // Update continuous param (index 1) with value 0.5 → should be 64
    tw.updateRemoteControlLED(1, 0.5);
    var cc6 = tw.encoderToCC(6);
    var contMsgs = out.messages.filter(function(m) { return m.status === 0xB0 && m.data1 === cc6; });
    assert(contMsgs[0].data2 === 64, 'continuous LED update should be 64, got ' + contMsgs[0].data2);
})();

// isInRemoteControlMode returns true when RC active
(function() {
    var bw = fakeBitwig({}, {
        remoteControls: ['A', '', '', '', '', '', '', ''],
        discreteValueCounts: [-1, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw });
    assert(tw.isInRemoteControlMode() === false, 'should be false before linking');
    tw.linkEncodersToRemoteControls();
    assert(tw.isInRemoteControlMode() === true, 'should be true after linking');
})();

// after unlinkAll, isInRemoteControlMode returns false
(function() {
    var bw = fakeBitwig({}, {
        remoteControls: ['A', '', '', '', '', '', '', ''],
        discreteValueCounts: [-1, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToRemoteControls();
    assert(tw.isInRemoteControlMode() === true, 'should be true after linking');
    tw.unlinkAll();
    assert(tw.isInRemoteControlMode() === false, 'should be false after unlinkAll');
})();

// updateRemoteControlLED is no-op when not in RC mode
(function() {
    var out = fakeMidiOutput();
    var tw = makeTwister({ midiOutput: out });
    out.messages.length = 0;
    tw.updateRemoteControlLED(0, 0.5);
    assert(out.messages.length === 0, 'should send no messages when not in RC mode');
})();

// handleEncoderTurn routes through behavior for RC continuous param
(function() {
    var bw = fakeBitwig({}, {
        remoteControls: ['Cutoff', '', '', '', '', '', '', ''],
        remoteControlValues: [0, 0, 0, 0, 0, 0, 0, 0],
        discreteValueCounts: [-1, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToRemoteControls();
    tw.handleEncoderTurn(5, 100);
    var param = bw.getRemoteControls().getParameter(0);
    assert(Math.abs(param.value().get() - 100/127) < 0.01, 'encoder turn should route through behavior to set param value');
})();

// handleEncoderPress routes through behavior for RC toggle param
(function() {
    var bw = fakeBitwig({}, {
        remoteControls: ['Toggle', '', '', '', '', '', '', ''],
        remoteControlValues: [0, 0, 0, 0, 0, 0, 0, 0],
        discreteValueCounts: [2, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToRemoteControls();
    tw.handleEncoderPress(5, true);
    var param = bw.getRemoteControls().getParameter(0);
    assert(param.value().get() === 1, 'encoder press should toggle value to 1');
})();

// RC continuous param press shows growl with param name (device mode)
(function() {
    var h = fakeHost();
    var bw = fakeBitwig({}, {
        remoteControls: ['Cutoff', '', '', '', '', '', '', ''],
        remoteControlValues: [0, 0, 0, 0, 0, 0, 0, 0],
        discreteValueCounts: [-1, -1, -1, -1, -1, -1, -1, -1]
    });
    var tw = makeTwister({ bitwig: bw, host: h });
    tw.linkEncodersToRemoteControls();
    tw.handleEncoderPress(5, true);
    assert(h.notifications.length === 1, 'should show one notification');
    assert(h.notifications[0] === 'Cutoff', 'notification should be param name "Cutoff", got "' + h.notifications[0] + '"');
})();

// RC continuous param press shows growl with param name (track mode)
(function() {
    var h = fakeHost();
    var cachedRC = null;
    var bw = {
        getTrack: function() { return null; },
        getFxTracks: function() { return []; },
        getTrackRemoteControls: function() {
            if (cachedRC) return cachedRC;
            var val = 0;
            cachedRC = {
                getParameter: function(i) {
                    return {
                        name: function() { return { get: function() { return i === 0 ? 'Resonance' : ''; } }; },
                        value: function() { return { get: function() { return val; }, set: function(v) { val = v; } }; },
                        discreteValueCount: function() { return { get: function() { return -1; } }; }
                    };
                }
            };
            return cachedRC;
        },
        getRemoteControls: function() { return null; }
    };
    var tw = makeTwister({ bitwig: bw, host: h });
    tw.linkEncodersToTrackRemoteControls();
    tw.handleEncoderPress(5, true);
    assert(h.notifications.length === 1, 'track RC should show one notification');
    assert(h.notifications[0] === 'Resonance', 'track RC notification should be "Resonance", got "' + h.notifications[0] + '"');
})();

// send encoder press shows growl with send name
(function() {
    var h = fakeHost();
    var track = fakeTrack({ name: 'Bass', sendNames: ['Delay', 'Reverb'] });
    var bw = fakeBitwig({ 0: track });
    var fxTrack = fakeTrack({ name: 'Delay FX', r: 0, g: 255, b: 0 });
    bw.getFxTracks = function() {
        return [{ number: 1, index: 0, track: fxTrack }];
    };
    var tw = makeTwister({ bitwig: bw, host: h });
    tw.linkEncodersToTrackSends(0);
    tw.handleEncoderPress(1, true);
    assert(h.notifications.length === 1, 'send press should show notification');
    assert(h.notifications[0] === 'Delay', 'send notification should be "Delay", got "' + h.notifications[0] + '"');
})();

// handleEncoderPress calls makeVisibleInArranger on press (solo)
(function() {
    var track = fakeTrack({ name: 'Drums' });
    var bw = fakeBitwig({ 0: track });
    var h = fakeHost();
    var tw = makeTwister({ bitwig: bw, host: h });

    tw.linkEncoderToTrack(1, 0);
    tw.handleEncoderPress(1, true);

    assert(track._getVisibleCalls() === 1, 'should call makeVisibleInArranger on press');

    tw.handleEncoderPress(1, false);
    assert(track._getVisibleCalls() === 1, 'should NOT call makeVisibleInArranger on release');
})();

// linkEncodersToProjectRemoteControls links 8 params with cyan color
(function() {
    var out = fakeMidiOutput();
    var bw = fakeBitwig({}, {});
    var cachedProjectRC = null;
    bw.getProjectRemoteControls = function() {
        if (cachedProjectRC) return cachedProjectRC;
        var params = {};
        for (var i = 0; i < 8; i++) {
            (function(idx) {
                var val = 0;
                params[idx] = {
                    name: function() { return { get: function() { return 'Param ' + idx; } }; },
                    value: function() { return { get: function() { return val; }, set: function(v) { val = v; } }; },
                    discreteValueCount: function() { return { get: function() { return -1; } }; }
                };
            })(i);
        }
        cachedProjectRC = { getParameter: function(i) { return params[i]; } };
        return cachedProjectRC;
    };
    var tw = makeTwister({ midiOutput: out, bitwig: bw });
    out.messages.length = 0;
    tw.linkEncodersToProjectRemoteControls();
    assert(tw._projectRCMode === true, 'should set _projectRCMode to true');
    var cyanIndex = tw.findClosestColorIndex(0, 200, 255);
    var cyanColorMsgs = out.messages.filter(function(m) { return m.status === 0xB1 && m.data2 === cyanIndex; });
    assert(cyanColorMsgs.length === 8, "should send 8 cyan color messages, got " + cyanColorMsgs.length);
})();

// linkEncodersToProjectRemoteControls returns early when no project RCs
(function() {
    var bw = fakeBitwig({}, {});
    bw.getProjectRemoteControls = function() { return null; };
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToProjectRemoteControls();
    assert(tw._projectRCMode === true, '_projectRCMode should be set even without RCs');
    assert(Object.keys(tw._rcParamToEncoder).length === 0, 'no params should be mapped');
})();

// updateProjectRemoteControlLED updates LED when in project RC mode
(function() {
    var out = fakeMidiOutput();
    var bw = fakeBitwig({}, {});
    bw.getProjectRemoteControls = function() {
        var params = {};
        for (var i = 0; i < 8; i++) {
            (function(idx) {
                params[idx] = {
                    name: function() { return { get: function() { return ''; } }; },
                    value: function() { return { get: function() { return 0; }, set: function() {} }; },
                    discreteValueCount: function() { return { get: function() { return -1; } }; }
                };
            })(i);
        }
        return { getParameter: function(i) { return params[i]; } };
    };
    var tw = makeTwister({ midiOutput: out, bitwig: bw });
    tw.linkEncodersToProjectRemoteControls();
    out.messages.length = 0;
    tw.updateProjectRemoteControlLED(0, 0.5);
    var encoderNum = ((0 + 4) % 8) + 1; // = 5
    var cc = tw.encoderToCC(encoderNum);
    var ledMsgs = out.messages.filter(function(m) { return m.status === 0xB0 && m.data1 === cc; });
    assert(ledMsgs.length === 1, 'should send one LED message');
    assert(ledMsgs[0].data2 === Math.round(0.5 * 127), 'LED value should match');
})();

// updateProjectRemoteControlLED is no-op when not in project RC mode
(function() {
    var out = fakeMidiOutput();
    var tw = makeTwister({ midiOutput: out });
    tw.updateProjectRemoteControlLED(0, 0.5);
    assert(out.messages.length === 0, 'should not send any messages when not in project RC mode');
})();

// unlinkAll clears _projectRCMode
(function() {
    var bw = fakeBitwig({}, {});
    bw.getProjectRemoteControls = function() { return null; };
    var tw = makeTwister({ bitwig: bw });
    tw.linkEncodersToProjectRemoteControls();
    assert(tw._projectRCMode === true, '_projectRCMode should be true');
    tw.unlinkAll();
    assert(tw._projectRCMode === false, 'unlinkAll should clear _projectRCMode');
})();

// ---- summary ----

process.exit(t.summary('Twister'));
