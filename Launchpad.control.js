loadAPI(17);

host.defineController("Generic", "Launchpad + Twister", "1.0", "3ffac818-54ac-45e0-928a-d01628afceac", "xan_t");
host.defineMidiPorts(2, 2);
// Multi-device setup - add manually in Bitwig Settings > Controllers
// host.addDeviceNameBasedDiscoveryPair(["Launchpad"], ["Launchpad"]);

var colors = {
    off: 0,
    green: 21,
    red: 5,
    amber: 17,
    yellow: 13,
    orange: 9,
    lime: 37,
    cyan: 41,
    blue: 45,
    purple: 49,
    pink: 53,
    white: 3
};

// Pad configuration: Map note numbers to labels (bottom 4 rows)
var padConfig = {
    // Row 0 (bottom)
    11: "pad1",  12: "pad2",  13: "pad3",  14: "pad4",  15: "pad5",  16: "pad6",  17: "pad7",  18: "pad8",
    // Row 1
    21: "pad9",  22: "pad10", 23: "pad11", 24: "pad12", 25: "pad13", 26: "pad14", 27: "pad15", 28: "pad16",
    // Row 2
    31: "pad17", 32: "pad18", 33: "pad19", 34: "pad20", 35: "pad21", 36: "pad22", 37: "pad23", 38: "pad24",
    // Row 3
    41: "pad25", 42: "pad26", 43: "pad27", 44: "pad28", 45: "pad29", 46: "pad30", 47: "pad31", 48: "pad32"
};

var launchpadOut;
var twisterOut;
var selectedPad = null;

// Bitwig API objects
var trackBank;

function init() {
    transport = host.createTransport();

    // Launchpad on port 0
    launchpadOut = host.getMidiOutPort(0);
    println("Launchpad MIDI Output: " + (launchpadOut ? "Connected" : "NULL"));

    noteIn = host.getMidiInPort(0).createNoteInput("Launchpad", "??????");
    noteIn.setShouldConsumeEvents(false);

    host.getMidiInPort(0).setMidiCallback(onLaunchpadMidi);
    host.getMidiInPort(0).setSysexCallback(onSysex);

    // MIDI Fighter Twister on port 1
    twisterOut = host.getMidiOutPort(1);
    println("Twister MIDI Output: " + (twisterOut ? "Connected" : "NULL"));

    host.getMidiInPort(1).setMidiCallback(onTwisterMidi);

    // Create track bank to access all tracks
    trackBank = host.createTrackBank(64, 0, 0);

    // Subscribe to all track names and solo states so we can read/control them
    for (var i = 0; i < 64; i++) {
        trackBank.getItemAt(i).name().markInterested();
        trackBank.getItemAt(i).solo().markInterested();
    }

    // Enter Programmer Mode on Launchpad MK2
    // SysEx: F0h 00h 20h 29h 02h 18h 21h 01h F7h
    launchpadOut.sendSysex("F0 00 20 29 02 18 21 01 F7");
}

function selectPad(note) {
    // Check if this pad is in our config
    if (!padConfig[note]) {
        return;
    }

    // Turn off previously selected pad
    if (selectedPad !== null) {
        launchpadOut.sendMidi(0x90, selectedPad, colors.off);
    }

    // Light up new pad
    launchpadOut.sendMidi(0x90, note, colors.green);

    // Update state
    selectedPad = note;
}

function onLaunchpadMidi(status, data1, data2) {
    printMidi(status, data1, data2);

    // Handle pad press (note on with velocity > 0)
    if (status === 0x90 && data2 > 0) {
        selectPad(data1);
    }
}

function findTrackByCC(ccNumber) {
    // Search through all tracks to find one with "(CC#)" in the name
    for (var i = 0; i < 64; i++) {
        var track = trackBank.getItemAt(i);
        var trackName = track.name().get();
        var searchString = "(" + ccNumber + ")";

        if (trackName.indexOf(searchString) !== -1) {
            return track;
        }
    }
    return null;
}

function onTwisterMidi(status, data1, data2) {
    // Only respond when pad1 is selected
    if (selectedPad !== 11) {
        return;
    }

    // Handle encoder turn (CC on channel 0, status 0xB0)
    if (status === 0xB0) {
        println("Twister Encoder: " + data1 + " value: " + data2);

        // Find track with "(CC#)" in the name
        var track = findTrackByCC(data1);

        if (track) {
            var normalizedValue = data2 / 127.0;
            track.volume().set(normalizedValue);
            println("Volume set to: " + normalizedValue.toFixed(2));
        } else {
            println("No track found with (" + data1 + ") in name");
        }
    }

    // Handle button press (CC on channel 1, status 0xB1)
    if (status === 0xB1) {
        println("Twister Button: " + data1 + " value: " + data2);
        var track = findTrackByCC(data1);
        if (track) {
            if (data2 > 0) {
                track.solo().set(true);
            } else {
                track.solo().set(false);
            }
        }
    }
}

function onSysex(data) {
    printSysex(data);
}

function flush() {
}

function exit() {
    // Turn off all pads
    for (var i = 0; i < 128; i++) {
        launchpadOut.sendMidi(0x90, i, 0);
    }

    // Return to Live mode on Launchpad MK2
    // SysEx: F0h 00h 20h 29h 02h 18h 21h 00h F7h
    launchpadOut.sendSysex("F0 00 20 29 02 18 21 00 F7");
}
