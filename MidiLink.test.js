var MidiLinkHW = require('./MidiLink');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeMidiOutput() {
    var sent = [];
    return {
        sent: sent,
        sendMidi: function(status, data1, data2) { sent.push({ status: status, data1: data1, data2: data2 }); }
    };
}

function fakeHost() {
    var notifications = [];
    return {
        notifications: notifications,
        showPopupNotification: function(msg) { notifications.push(msg); }
    };
}

// ---- encode tests ----

// encode produces length header + payload events
(function() {
    var events = MidiLinkHW.encode({ growl: "Hi" });
    var json = JSON.stringify({ growl: "Hi" });
    assert(events.length === json.length + 2, 'event count = payload length + 2 header');
    // Header
    assert(events[0].status === 0x9E, 'header 0 status is channel 15');
    assert(events[0].data1 === 0, 'header 0 note is 0');
    assert(events[0].data2 === (json.length & 0x7F), 'header 0 velocity is length low 7');
    assert(events[1].data1 === 1, 'header 1 note is 1');
    assert(events[1].data2 === ((json.length >> 7) & 0x7F), 'header 1 velocity is length high 7');
    // Payload
    for (var i = 0; i < json.length; i++) {
        assert(events[i + 2].data1 === i + 2, 'payload note ' + i + ' is ' + (i + 2));
        assert(events[i + 2].data2 === json.charCodeAt(i), 'payload velocity matches char code');
    }
})();

// encode null returns empty array
(function() {
    var events = MidiLinkHW.encode(null);
    assert(events.length === 0, 'null message produces no events');
})();

// ---- decode tests ----

// decode roundtrip
(function() {
    var original = { growl: "Hello from Bitwig" };
    var events = MidiLinkHW.encode(original);
    var decoded = MidiLinkHW.decode(events);
    assert(decoded !== null, 'decoded is not null');
    assert(decoded.growl === "Hello from Bitwig", 'growl roundtrips correctly');
})();

// decode null/invalid returns null
(function() {
    assert(MidiLinkHW.decode(null) === null, 'decode null returns null');
    assert(MidiLinkHW.decode([]) === null, 'decode empty returns null');
    assert(MidiLinkHW.decode([{ data2: 5 }]) === null, 'decode too few events returns null');
})();

// decode with truncated payload returns null
(function() {
    var events = MidiLinkHW.encode({ growl: "test" });
    events.pop(); // remove last payload event
    var decoded = MidiLinkHW.decode(events);
    assert(decoded === null, 'truncated payload returns null');
})();

// ---- send tests ----

// send calls sendMidi for each event
(function() {
    var out = fakeMidiOutput();
    var host = fakeHost();
    var link = new MidiLinkHW({ midiOutput: out, host: host });
    link.send({ growl: "test" });
    var json = JSON.stringify({ growl: "test" });
    assert(out.sent.length === json.length + 2, 'sendMidi called for each event');
    assert(out.sent[0].status === 0x9E, 'first event uses channel 15');
    assert(host.notifications[0] === "MidiLink: growl sent", 'host notification shown');
})();

// send with no midiOutput does not throw
(function() {
    var link = new MidiLinkHW({});
    link.send({ growl: "test" }); // should not throw
    assert(true, 'send with no output does not throw');
})();

// ---- large message test ----

// encode long string uses 14-bit length correctly
(function() {
    var longStr = '';
    for (var i = 0; i < 200; i++) longStr += 'abcdefghij'; // 2000 chars
    var events = MidiLinkHW.encode({ growl: longStr });
    var json = JSON.stringify({ growl: longStr });
    var lengthLow = events[0].data2;
    var lengthHigh = events[1].data2;
    var reconstructed = lengthLow | (lengthHigh << 7);
    assert(reconstructed === json.length, '14-bit length reconstructs correctly for ' + json.length + ' chars');
    // Roundtrip
    var decoded = MidiLinkHW.decode(events);
    assert(decoded.growl === longStr, 'large message roundtrips');
})();

// ---- receive tests ----

// receive accumulates channel 16 events and returns message when complete
(function() {
    var link = new MidiLinkHW({});
    var msg = { growl: "Hi" };
    var json = JSON.stringify(msg);
    var length = json.length;

    // Send length header
    var result = link.receive(0x9F, 0, length & 0x7F);
    assert(result === null, 'receive: first header event returns null');
    result = link.receive(0x9F, 1, (length >> 7) & 0x7F);
    assert(result === null, 'receive: second header event returns null');

    // Send payload chars (all but last)
    for (var i = 0; i < length - 1; i++) {
        result = link.receive(0x9F, i + 2, json.charCodeAt(i));
        assert(result === null, 'receive: payload event ' + i + ' returns null');
    }

    // Last payload char completes the frame
    result = link.receive(0x9F, length + 1, json.charCodeAt(length - 1));
    assert(result !== null, 'receive: last event returns decoded message');
    assert(result.growl === "Hi", 'receive: growl field roundtrips');
})();

// receive ignores channel 15 events
(function() {
    var link = new MidiLinkHW({});
    var result = link.receive(0x9E, 0, 5);
    assert(result === null, 'receive: channel 15 event returns null');
    // Internal state should not have accumulated anything
    assert(link._rxEvents.length === 0, 'receive: channel 15 does not accumulate');
})();

// receive ignores non-note-on events
(function() {
    var link = new MidiLinkHW({});
    var result = link.receive(0x80, 0, 5);
    assert(result === null, 'receive: non-note-on returns null');
    assert(link._rxEvents.length === 0, 'receive: non-note-on does not accumulate');
})();

// receive calls onMessage callback when frame is complete
(function() {
    var received = [];
    var link = new MidiLinkHW({ onMessage: function(m) { received.push(m); } });
    var msg = { growl: "cb" };
    var json = JSON.stringify(msg);
    var length = json.length;

    link.receive(0x9F, 0, length & 0x7F);
    link.receive(0x9F, 1, (length >> 7) & 0x7F);
    for (var i = 0; i < length; i++) {
        link.receive(0x9F, i + 2, json.charCodeAt(i));
    }
    assert(received.length === 1, 'onMessage called once');
    assert(received[0].growl === "cb", 'onMessage receives decoded message');
})();

// receive resets state after complete frame, can receive another
(function() {
    var link = new MidiLinkHW({});

    function feedMessage(obj) {
        var json = JSON.stringify(obj);
        var length = json.length;
        link.receive(0x9F, 0, length & 0x7F);
        link.receive(0x9F, 1, (length >> 7) & 0x7F);
        var result = null;
        for (var i = 0; i < length; i++) {
            result = link.receive(0x9F, i + 2, json.charCodeAt(i));
        }
        return result;
    }

    var r1 = feedMessage({ growl: "first" });
    assert(r1.growl === "first", 'receive: first message decoded');
    var r2 = feedMessage({ growl: "second" });
    assert(r2.growl === "second", 'receive: second message decoded after reset');
})();

// ---- summary ----

process.exit(t.summary('MidiLink'));
