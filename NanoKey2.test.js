var NanoKey2HW = require('./NanoKey2');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeRolandPiano() {
    var calls = [];
    return {
        calls: calls,
        lastTranspose: null,
        setTranspose: function(semitones) {
            this.lastTranspose = semitones;
            calls.push({ method: 'setTranspose', semitones: semitones });
        }
    };
}

function fakeHost() {
    var notifications = [];
    return {
        notifications: notifications,
        showPopupNotification: function(msg) { notifications.push(msg); },
        getMidiInPort: function() {
            return {
                createNoteInput: function() {
                    return { setShouldConsumeEvents: function() {} };
                }
            };
        }
    };
}

function makeNano(opts) {
    opts = opts || {};
    return new NanoKey2HW({
        rolandPiano: opts.rolandPiano || fakeRolandPiano(),
        host: opts.host || fakeHost(),
        debug: false,
        println: function() {}
    });
}

// ---- tests ----

// default key is Db
(function() {
    var nano = makeNano();
    assert(nano.getCurrentKey() === "Db", "default key should be Db");
})();

// selecting C major sets transpose to -1 on RolandPiano
(function() {
    var piano = fakeRolandPiano();
    var nano = makeNano({ rolandPiano: piano });
    nano.handleKeySelection(48); // C Major
    assert(piano.lastTranspose === -1, "C major should set transpose to -1");
    assert(nano.getCurrentKey() === "C", "current key should be C after selection");
})();

// selecting Db major sets transpose to 0
(function() {
    var piano = fakeRolandPiano();
    var nano = makeNano({ rolandPiano: piano });
    nano.handleKeySelection(49); // Db Major
    assert(piano.lastTranspose === 0, "Db major should set transpose to 0");
})();

// selecting F# major sets transpose to 5
(function() {
    var piano = fakeRolandPiano();
    var nano = makeNano({ rolandPiano: piano });
    nano.handleKeySelection(54); // F# Major
    assert(piano.lastTranspose === 5, "F# major should set transpose to 5");
    assert(nano.getCurrentKey() === "F#", "current key should be F#");
})();

// minor key: A minor uses relative major (C) transpose of -1
(function() {
    var piano = fakeRolandPiano();
    var nano = makeNano({ rolandPiano: piano });
    nano.handleKeySelection(69); // A Minor
    assert(piano.lastTranspose === -1, "A minor should set transpose to -1 (relative major C)");
    assert(nano.getCurrentKey() === "A", "current key should be A");
})();

// minor key: D minor uses relative major (F) transpose of 4
(function() {
    var piano = fakeRolandPiano();
    var nano = makeNano({ rolandPiano: piano });
    nano.handleKeySelection(62); // D Minor
    assert(piano.lastTranspose === 4, "D minor should set transpose to 4 (relative major F)");
})();

// key selection shows popup notification with key and mode
(function() {
    var h = fakeHost();
    var nano = makeNano({ host: h });
    nano.handleKeySelection(52); // E Major
    assert(h.notifications.length === 1, "should show one notification");
    assert(h.notifications[0] === "Key: E Major", "notification should show key and mode");
})();

// minor key notification shows Minor mode
(function() {
    var h = fakeHost();
    var nano = makeNano({ host: h });
    nano.handleKeySelection(67); // G Minor
    assert(h.notifications[0] === "Key: G Minor", "notification should show minor mode");
})();

// unknown MIDI notes are ignored (no transpose, no notification)
(function() {
    var piano = fakeRolandPiano();
    var h = fakeHost();
    var nano = makeNano({ rolandPiano: piano, host: h });
    nano.handleKeySelection(40); // below range
    assert(piano.calls.length === 0, "should not call setTranspose for unknown note");
    assert(h.notifications.length === 0, "should not show notification for unknown note");
    assert(nano.getCurrentKey() === "Db", "current key should remain Db");
})();

// MIDI note between major and minor ranges is ignored
(function() {
    var piano = fakeRolandPiano();
    var nano = makeNano({ rolandPiano: piano });
    nano.handleKeySelection(72); // above minor range
    assert(piano.calls.length === 0, "should not call setTranspose for note 72");
})();

// selecting multiple keys updates getCurrentKey each time
(function() {
    var nano = makeNano();
    nano.handleKeySelection(48); // C
    assert(nano.getCurrentKey() === "C", "should be C");
    nano.handleKeySelection(55); // G
    assert(nano.getCurrentKey() === "G", "should be G");
    nano.handleKeySelection(65); // F Minor
    assert(nano.getCurrentKey() === "F", "should be F after F minor");
})();

// init creates note input via host
(function() {
    var portCreated = false;
    var h = {
        showPopupNotification: function() {},
        getMidiInPort: function(port) {
            assert(port === 3, "should request port 3");
            return {
                createNoteInput: function(name, mask) {
                    portCreated = true;
                    assert(name === "nanoKEY2 - Key Selector", "note input name");
                    return { setShouldConsumeEvents: function() {} };
                }
            };
        }
    };
    var nano = makeNano({ host: h });
    nano.init();
    assert(portCreated, "should create note input on init");
})();

// init with custom midiInPort skips host.getMidiInPort
(function() {
    var customPortUsed = false;
    var customPort = {
        createNoteInput: function() {
            customPortUsed = true;
            return { setShouldConsumeEvents: function() {} };
        }
    };
    var nano = makeNano();
    nano.init(customPort);
    assert(customPortUsed, "should use provided midiInPort");
})();

process.exit(t.summary('NanoKey2'));
