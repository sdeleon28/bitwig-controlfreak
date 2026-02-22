var ClipGestures = require('./ClipGestures');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeLaunchpad() {
    return {
        colors: { green: 21, off: 0 },
        buttons: { top6: 109 },
        topButtonColors: {},
        setTopButtonColor: function(cc, color) { this.topButtonColors[cc] = color; }
    };
}

function fakeClipLauncher() {
    return {
        calls: [],
        _trackBank: {
            getItemAt: function(t) {
                return { stop: function() {} };
            }
        },
        launchClip: function(t, s) { this.calls.push({ method: 'launchClip', t: t, s: s }); },
        recordClip: function(t, s) { this.calls.push({ method: 'recordClip', t: t, s: s }); },
        deleteClip: function(t, s) { this.calls.push({ method: 'deleteClip', t: t, s: s }); },
        handleDuplicateClick: function(t, s) { this.calls.push({ method: 'handleDuplicateClick', t: t, s: s }); },
        clearDuplicateSource: function() { this.calls.push({ method: 'clearDuplicateSource' }); }
    };
}

function fakeSlot(opts) {
    opts = opts || {};
    return {
        isRecording: function() { return { get: function() { return !!opts.recording; } }; },
        isRecordingQueued: function() { return { get: function() { return !!opts.recordingQueued; } }; },
        hasContent: function() { return { get: function() { return !!opts.hasContent; } }; }
    };
}

function makeGestures(lp, cl) {
    lp = lp || fakeLaunchpad();
    cl = cl || fakeClipLauncher();
    return new ClipGestures({ launchpad: lp, clipLauncher: cl });
}

// ---- tests ----

// default click on recording slot stops the track
(function() {
    var cl = fakeClipLauncher();
    var stopped = false;
    cl._trackBank = {
        getItemAt: function() { return { stop: function() { stopped = true; } }; }
    };
    var g = makeGestures(null, cl);
    g.click(function(t, s, slot) {
        if (slot.isRecording().get() || slot.isRecordingQueued().get()) {
            this._trackBank.getItemAt(t).stop();
            return;
        }
    });
    g.executeClick(0, 0, fakeSlot({ recording: true }));
    assert(stopped, 'click on recording slot stops track');
})();

// default click on slot with content launches clip
(function() {
    var cl = fakeClipLauncher();
    var g = makeGestures(null, cl);
    g.click(function(t, s, slot) {
        if (slot.hasContent().get()) this.launchClip(t, s);
    });
    g.executeClick(2, 1, fakeSlot({ hasContent: true }));
    assert(cl.calls.length === 1 && cl.calls[0].method === 'launchClip',
        'click on slot with content launches clip');
})();

// default click on empty slot records
(function() {
    var cl = fakeClipLauncher();
    var g = makeGestures(null, cl);
    g.click(function(t, s, slot) {
        if (!slot.hasContent().get()) this.recordClip(t, s);
    });
    g.executeClick(3, 0, fakeSlot());
    assert(cl.calls.length === 1 && cl.calls[0].method === 'recordClip',
        'click on empty slot records');
})();

// default hold deletes clip
(function() {
    var cl = fakeClipLauncher();
    var g = makeGestures(null, cl);
    g.hold(function(t, s, slot) { this.deleteClip(t, s); });
    g.executeHold(1, 2, fakeSlot());
    assert(cl.calls.length === 1 && cl.calls[0].method === 'deleteClip',
        'hold deletes clip');
})();

// modifier press sets button color and returns true
(function() {
    var lp = fakeLaunchpad();
    var g = makeGestures(lp);
    g.modifier(109, { name: 'test', color: 21 });
    var result = g.handleModifierPress(109);
    assert(result === true, 'modifier press returns true');
    assert(lp.topButtonColors[109] === 21, 'modifier press sets button color');
})();

// unregistered modifier press returns false
(function() {
    var g = makeGestures();
    var result = g.handleModifierPress(99);
    assert(result === false, 'unregistered modifier press returns false');
})();

// modifier release resets button color and calls onRelease
(function() {
    var lp = fakeLaunchpad();
    var cl = fakeClipLauncher();
    var g = makeGestures(lp, cl);
    g.modifier(109, {
        name: 'test',
        color: 21,
        onRelease: function() { this.clearDuplicateSource(); }
    });
    g.handleModifierPress(109);
    var result = g.handleModifierRelease(109);
    assert(result === true, 'modifier release returns true');
    assert(lp.topButtonColors[109] === 0, 'modifier release resets button color to off');
    assert(cl.calls.length === 1 && cl.calls[0].method === 'clearDuplicateSource',
        'modifier release calls onRelease with clipLauncher as this');
})();

// click with active modifier uses modifier click handler
(function() {
    var cl = fakeClipLauncher();
    var g = makeGestures(null, cl);
    g.click(function(t, s, slot) { this.launchClip(t, s); });
    g.modifier(109, {
        name: 'dup',
        color: 21,
        click: function(t, s, slot) { this.handleDuplicateClick(t, s); }
    });
    g.handleModifierPress(109);
    g.executeClick(4, 1, fakeSlot({ hasContent: true }));
    assert(cl.calls.length === 1 && cl.calls[0].method === 'handleDuplicateClick',
        'click with active modifier uses modifier click handler');
})();

// hold with active modifier falls back to default when no modifier hold defined
(function() {
    var cl = fakeClipLauncher();
    var g = makeGestures(null, cl);
    g.hold(function(t, s, slot) { this.deleteClip(t, s); });
    g.modifier(109, { name: 'dup', color: 21, click: function() {} });
    g.handleModifierPress(109);
    g.executeHold(2, 0, fakeSlot());
    assert(cl.calls.length === 1 && cl.calls[0].method === 'deleteClip',
        'hold falls back to default when modifier has no hold handler');
})();

// modifier release clears active modifier state
(function() {
    var cl = fakeClipLauncher();
    var g = makeGestures(null, cl);
    g.click(function(t, s, slot) { this.launchClip(t, s); });
    g.modifier(109, {
        name: 'dup',
        color: 21,
        click: function(t, s, slot) { this.handleDuplicateClick(t, s); }
    });
    g.handleModifierPress(109);
    g.handleModifierRelease(109);
    g.executeClick(0, 0, fakeSlot({ hasContent: true }));
    assert(cl.calls.length === 1 && cl.calls[0].method === 'launchClip',
        'after modifier release, click uses default handler');
})();

// ---- summary ----

process.exit(t.summary('ClipGestures'));
