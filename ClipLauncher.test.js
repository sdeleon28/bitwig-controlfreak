var ClipLauncherHW = require('./ClipLauncher');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeSlot(opts) {
    opts = opts || {};
    return {
        _launched: false,
        _recorded: false,
        _deleted: false,
        _copiedFrom: null,
        hasContent: function() { return { get: function() { return !!opts.hasContent; }, markInterested: function() {}, addValueObserver: function() {} }; },
        isPlaying: function() { return { get: function() { return !!opts.playing; }, markInterested: function() {}, addValueObserver: function() {} }; },
        isRecording: function() { return { get: function() { return !!opts.recording; }, markInterested: function() {}, addValueObserver: function() {} }; },
        isPlaybackQueued: function() { return { get: function() { return !!opts.playbackQueued; }, markInterested: function() {}, addValueObserver: function() {} }; },
        isRecordingQueued: function() { return { get: function() { return !!opts.recordingQueued; }, markInterested: function() {}, addValueObserver: function() {} }; },
        color: function() { return { markInterested: function() {}, addValueObserver: function() {} }; },
        launch: function() { this._launched = true; },
        record: function() { this._recorded = true; },
        deleteObject: function() { this._deleted = true; },
        copyFrom: function(src) { this._copiedFrom = src; }
    };
}

function fakeTrack(opts) {
    opts = opts || {};
    var slots = {};
    var armed = { _val: false, set: function(v) { this._val = v; }, get: function() { return this._val; } };
    var stopped = false;
    return {
        _armed: armed,
        _stopped: false,
        _slots: slots,
        clipLauncherSlotBank: function() {
            return {
                getItemAt: function(s) {
                    if (!slots[s]) slots[s] = fakeSlot(opts.slotOpts && opts.slotOpts[s]);
                    return slots[s];
                }
            };
        },
        arm: function() { return armed; },
        stop: function() { this._stopped = true; },
        color: function() { return { markInterested: function() {}, addValueObserver: function() {} }; }
    };
}

function fakeTrackBank(trackMap) {
    trackMap = trackMap || {};
    var tracks = {};
    return {
        getItemAt: function(t) {
            if (!tracks[t]) tracks[t] = trackMap[t] || fakeTrack();
            return tracks[t];
        },
        sceneBank: function() { return fakeSceneBank(); }
    };
}

function fakeSceneBank() {
    var scenes = {};
    return {
        getItemAt: function(s) {
            if (!scenes[s]) scenes[s] = {
                _launched: false,
                launch: function() { this._launched = true; },
                exists: function() { return { markInterested: function() {}, addValueObserver: function() {} }; }
            };
            return scenes[s];
        }
    };
}

function fakeLaunchpad() {
    return {
        colors: { red: 5, green: 21, blue: 45, yellow: 13, purple: 53, pink: 56, off: 0 },
        buttons: { top6: 109 },
        _registered: [],
        registerPadBehavior: function(padNote, click, hold, page) {
            this._registered.push({ padNote: padNote, click: click, hold: hold, page: page });
        }
    };
}

function fakePager() {
    return {
        _paints: [],
        _flashings: [],
        _pulsings: [],
        requestPaint: function(page, pad, color) {
            this._paints.push({ page: page, pad: pad, color: color });
        },
        requestPaintFlashing: function(page, pad, color) {
            this._flashings.push({ page: page, pad: pad, color: color });
        },
        requestPaintPulsing: function(page, pad, color) {
            this._pulsings.push({ page: page, pad: pad, color: color });
        }
    };
}

function fakeHost(trackBank) {
    return {
        createMainTrackBank: function() { return trackBank || fakeTrackBank(); }
    };
}

function fakeClipGestures() {
    return {
        _clicks: [],
        _holds: [],
        executeClick: function(t, s, slot) { this._clicks.push({ t: t, s: s, slot: slot }); },
        executeHold: function(t, s, slot) { this._holds.push({ t: t, s: s, slot: slot }); }
    };
}

function makeClipLauncher(opts) {
    opts = opts || {};
    var lp = opts.launchpad || fakeLaunchpad();
    var pager = opts.pager || fakePager();
    var tb = opts.trackBank || fakeTrackBank();
    var h = opts.host || fakeHost(tb);
    var cl = new ClipLauncherHW({
        host: h,
        launchpad: lp,
        pager: pager,
        clipGestures: opts.clipGestures || fakeClipGestures(),
        debug: false,
        println: function() {}
    });
    cl.init();
    return cl;
}

// ---- getClipState tests ----

// recording queued → red flashing
(function() {
    var cl = makeClipLauncher();
    var state = cl.getClipState(fakeSlot({ recordingQueued: true }), { r: 0.5, g: 0.5, b: 0.5 });
    assert(state.color === cl.launchpad.colors.red, 'recording queued returns red');
    assert(state.mode === 'flashing', 'recording queued returns flashing mode');
})();

// recording → red static
(function() {
    var cl = makeClipLauncher();
    var state = cl.getClipState(fakeSlot({ recording: true }), { r: 0.5, g: 0.5, b: 0.5 });
    assert(state.color === cl.launchpad.colors.red, 'recording returns red');
    assert(state.mode === 'static', 'recording returns static mode');
})();

// playback queued → flashing
(function() {
    var cl = makeClipLauncher();
    var state = cl.getClipState(fakeSlot({ playbackQueued: true }), { r: 0.8, g: 0.2, b: 0.1 });
    assert(state.mode === 'flashing', 'playback queued returns flashing mode');
})();

// playing → pulsing
(function() {
    var cl = makeClipLauncher();
    var state = cl.getClipState(fakeSlot({ playing: true }), { r: 0.8, g: 0.2, b: 0.1 });
    assert(state.mode === 'pulsing', 'playing returns pulsing mode');
})();

// has content → static with track color
(function() {
    var cl = makeClipLauncher();
    var state = cl.getClipState(fakeSlot({ hasContent: true }), { r: 0.8, g: 0.2, b: 0.1 });
    assert(state.mode === 'static', 'has content returns static mode');
    assert(state.color === cl.launchpad.colors.red, 'red-dominant track color maps to red');
})();

// empty → off static
(function() {
    var cl = makeClipLauncher();
    var state = cl.getClipState(fakeSlot(), { r: 0.5, g: 0.5, b: 0.5 });
    assert(state.color === 0, 'empty slot returns color 0');
    assert(state.mode === 'static', 'empty slot returns static mode');
})();

// ---- mixColor tests ----

// ratio 0 returns first color
(function() {
    var cl = makeClipLauncher();
    var c = cl.mixColor({ r: 1, g: 0, b: 0 }, { r: 0, g: 1, b: 0 }, 0);
    assert(c.r === 1 && c.g === 0 && c.b === 0, 'ratio 0 returns first color');
})();

// ratio 1 returns second color
(function() {
    var cl = makeClipLauncher();
    var c = cl.mixColor({ r: 1, g: 0, b: 0 }, { r: 0, g: 1, b: 0 }, 1);
    assert(c.r === 0 && c.g === 1 && c.b === 0, 'ratio 1 returns second color');
})();

// ratio 0.5 returns midpoint
(function() {
    var cl = makeClipLauncher();
    var c = cl.mixColor({ r: 0, g: 0, b: 0 }, { r: 1, g: 1, b: 1 }, 0.5);
    assert(c.r === 0.5 && c.g === 0.5 && c.b === 0.5, 'ratio 0.5 returns midpoint');
})();

// ---- rgbToLaunchpadColor tests ----

// black → off
(function() {
    var cl = makeClipLauncher();
    assert(cl.rgbToLaunchpadColor(0, 0, 0) === 0, 'black maps to off');
})();

// red dominant → red
(function() {
    var cl = makeClipLauncher();
    assert(cl.rgbToLaunchpadColor(0.9, 0.1, 0.1) === cl.launchpad.colors.red, 'bright red maps to red');
})();

// green dominant → green
(function() {
    var cl = makeClipLauncher();
    assert(cl.rgbToLaunchpadColor(0.1, 0.9, 0.1) === cl.launchpad.colors.green, 'bright green maps to green');
})();

// blue dominant → blue
(function() {
    var cl = makeClipLauncher();
    assert(cl.rgbToLaunchpadColor(0.1, 0.1, 0.9) === cl.launchpad.colors.blue, 'bright blue maps to blue');
})();

// yellow → yellow
(function() {
    var cl = makeClipLauncher();
    assert(cl.rgbToLaunchpadColor(0.9, 0.9, 0.1) === cl.launchpad.colors.yellow, 'yellow maps to yellow');
})();

// purple → purple
(function() {
    var cl = makeClipLauncher();
    assert(cl.rgbToLaunchpadColor(0.9, 0.1, 0.9) === cl.launchpad.colors.purple, 'purple maps to purple');
})();

// ---- updateClipPad tests ----

// flashing clip uses requestPaintFlashing
(function() {
    var pager = fakePager();
    var tb = fakeTrackBank();
    // Set up a slot that is recording queued
    tb.getItemAt(0).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return fakeSlot({ recordingQueued: true }); } };
    };
    var cl = makeClipLauncher({ pager: pager, trackBank: tb });
    pager._flashings = []; pager._paints = []; pager._pulsings = [];
    cl.updateClipPad(0, 0);
    assert(pager._flashings.length > 0, 'recording queued clip uses requestPaintFlashing');
})();

// pulsing clip uses requestPaintPulsing
(function() {
    var pager = fakePager();
    var tb = fakeTrackBank();
    tb.getItemAt(0).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return fakeSlot({ playing: true }); } };
    };
    var cl = makeClipLauncher({ pager: pager, trackBank: tb });
    pager._pulsings = []; pager._paints = []; pager._flashings = [];
    cl.updateClipPad(0, 0);
    assert(pager._pulsings.length > 0, 'playing clip uses requestPaintPulsing');
})();

// static clip uses requestPaint
(function() {
    var pager = fakePager();
    var tb = fakeTrackBank();
    tb.getItemAt(0).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return fakeSlot({ hasContent: true }); } };
    };
    var cl = makeClipLauncher({ pager: pager, trackBank: tb });
    pager._paints = []; pager._flashings = []; pager._pulsings = [];
    cl.updateClipPad(0, 0);
    // Filter out scene pad paints (pad 81+)
    var clipPaints = pager._paints.filter(function(p) { return p.pad < 80; });
    assert(clipPaints.length > 0, 'static clip uses requestPaint');
})();

// ---- updateScenePad tests ----

// playing scene → green
(function() {
    var pager = fakePager();
    var lp = fakeLaunchpad();
    var tb = fakeTrackBank();
    // Make one slot playing in scene 0
    tb.getItemAt(0).clipLauncherSlotBank = function() {
        return { getItemAt: function(s) { return fakeSlot(s === 0 ? { playing: true } : {}); } };
    };
    var cl = makeClipLauncher({ pager: pager, launchpad: lp, trackBank: tb });
    pager._paints = [];
    cl.updateScenePad(0);
    var scenePaint = pager._paints.filter(function(p) { return p.pad === 81; });
    assert(scenePaint.length > 0 && scenePaint[0].color === lp.colors.green, 'playing scene shows green');
})();

// scene with content but not playing → dim green (21)
(function() {
    var pager = fakePager();
    var lp = fakeLaunchpad();
    var tb = fakeTrackBank();
    tb.getItemAt(0).clipLauncherSlotBank = function() {
        return { getItemAt: function(s) { return fakeSlot(s === 2 ? { hasContent: true } : {}); } };
    };
    var cl = makeClipLauncher({ pager: pager, launchpad: lp, trackBank: tb });
    pager._paints = [];
    cl.updateScenePad(2);
    var scenePaint = pager._paints.filter(function(p) { return p.pad === 83; });
    assert(scenePaint.length > 0 && scenePaint[0].color === 21, 'scene with content shows dim green');
})();

// empty scene → off
(function() {
    var pager = fakePager();
    var tb = fakeTrackBank();
    var cl = makeClipLauncher({ pager: pager, trackBank: tb });
    pager._paints = [];
    cl.updateScenePad(3);
    var scenePaint = pager._paints.filter(function(p) { return p.pad === 84; });
    assert(scenePaint.length > 0 && scenePaint[0].color === 0, 'empty scene shows off');
})();

// ---- launchClip / recordClip / deleteClip tests ----

// launchClip calls slot.launch()
(function() {
    var slot = fakeSlot({ hasContent: true });
    var tb = fakeTrackBank();
    tb.getItemAt(2).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return slot; } };
    };
    var cl = makeClipLauncher({ trackBank: tb });
    cl.launchClip(2, 1);
    assert(slot._launched, 'launchClip calls slot.launch()');
})();

// recordClip arms the target track and disarms others
(function() {
    var slot = fakeSlot();
    var track0 = fakeTrack();
    var track1 = fakeTrack();
    var track2 = fakeTrack();
    var tb = fakeTrackBank({ 0: track0, 1: track1, 2: track2 });
    tb.getItemAt(1).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return slot; } };
    };
    var cl = makeClipLauncher({ trackBank: tb });
    cl.recordClip(1, 0);
    assert(track1._armed._val === true, 'recordClip arms target track');
    assert(track0._armed._val === false, 'recordClip disarms other tracks');
    assert(slot._recorded, 'recordClip calls slot.record()');
})();

// deleteClip calls slot.deleteObject()
(function() {
    var slot = fakeSlot({ hasContent: true });
    var tb = fakeTrackBank();
    tb.getItemAt(3).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return slot; } };
    };
    var cl = makeClipLauncher({ trackBank: tb });
    cl.deleteClip(3, 2);
    assert(slot._deleted, 'deleteClip calls slot.deleteObject()');
})();

// ---- handleDuplicateClick tests ----

// first click on slot with content sets duplicate source
(function() {
    var slot = fakeSlot({ hasContent: true });
    var tb = fakeTrackBank();
    tb.getItemAt(1).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return slot; } };
    };
    var cl = makeClipLauncher({ trackBank: tb });
    cl.handleDuplicateClick(1, 3);
    assert(cl._duplicateSource !== null, 'first click sets duplicate source');
    assert(cl._duplicateSource.trackIndex === 1 && cl._duplicateSource.sceneIndex === 3, 'duplicate source has correct indices');
})();

// first click on empty slot does nothing
(function() {
    var slot = fakeSlot();
    var tb = fakeTrackBank();
    tb.getItemAt(0).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return slot; } };
    };
    var cl = makeClipLauncher({ trackBank: tb });
    cl.handleDuplicateClick(0, 0);
    assert(cl._duplicateSource === null, 'click on empty slot does not set source');
})();

// second click copies and clears source
(function() {
    var srcSlot = fakeSlot({ hasContent: true });
    var dstSlot = fakeSlot();
    var tb = fakeTrackBank();
    tb.getItemAt(0).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return srcSlot; } };
    };
    tb.getItemAt(2).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return dstSlot; } };
    };
    var cl = makeClipLauncher({ trackBank: tb });
    cl.handleDuplicateClick(0, 0);  // select source
    cl.handleDuplicateClick(2, 1);  // select destination
    assert(dstSlot._copiedFrom === srcSlot, 'second click copies source to destination');
    assert(cl._duplicateSource === null, 'source is cleared after copy');
})();

// ---- clearDuplicateSource tests ----

// clears source and restores pad color
(function() {
    var pager = fakePager();
    var tb = fakeTrackBank();
    tb.getItemAt(1).clipLauncherSlotBank = function() {
        return { getItemAt: function() { return fakeSlot({ hasContent: true }); } };
    };
    var cl = makeClipLauncher({ pager: pager, trackBank: tb });
    cl._duplicateSource = { trackIndex: 1, sceneIndex: 2 };
    pager._paints = [];
    cl.clearDuplicateSource();
    assert(cl._duplicateSource === null, 'clearDuplicateSource nulls source');
    assert(pager._paints.length > 0, 'clearDuplicateSource triggers pad update');
})();

// no-op when null
(function() {
    var pager = fakePager();
    var cl = makeClipLauncher({ pager: pager });
    pager._paints = [];
    cl.clearDuplicateSource();
    assert(cl._duplicateSource === null, 'clearDuplicateSource with null is no-op');
    assert(pager._paints.length === 0, 'no paints when source is null');
})();

// ---- registerPadBehaviors tests ----

// registers 56 pad behaviors (7 tracks × 8 scenes)
(function() {
    var lp = fakeLaunchpad();
    var cg = fakeClipGestures();
    var cl = makeClipLauncher({ launchpad: lp, clipGestures: cg });
    cl.registerPadBehaviors();
    assert(lp._registered.length === 56, 'registers 56 pad behaviors (7×8)');
})();

// registered behaviors use correct pad notes and page
(function() {
    var lp = fakeLaunchpad();
    var cg = fakeClipGestures();
    var cl = makeClipLauncher({ launchpad: lp, clipGestures: cg });
    cl.registerPadBehaviors();
    // Track 0, scene 0 → row 7, col 1 → pad 71
    var first = lp._registered.find(function(r) { return r.padNote === 71; });
    assert(first !== undefined, 'track 0, scene 0 registers pad note 71');
    assert(first.page === 3, 'registered on page 3');
    // Track 6, scene 7 → row 1, col 8 → pad 18
    var last = lp._registered.find(function(r) { return r.padNote === 18; });
    assert(last !== undefined, 'track 6, scene 7 registers pad note 18');
})();

// ---- launchScene test ----

// launchScene calls scene.launch()
(function() {
    var cl = makeClipLauncher();
    cl.launchScene(2);
    assert(cl._sceneBank.getItemAt(2)._launched, 'launchScene calls scene.launch()');
})();

// ---- stopTrack test ----

// stopTrack calls track.stop()
(function() {
    var track = fakeTrack();
    var tb = fakeTrackBank({ 3: track });
    var cl = makeClipLauncher({ trackBank: tb });
    cl.stopTrack(3);
    assert(track._stopped, 'stopTrack calls track.stop()');
})();

// ---- summary ----

process.exit(t.summary('ClipLauncher'));
