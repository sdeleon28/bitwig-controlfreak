loadAPI(17);

host.defineController("Generic", "Launchpad", "1.0", "3ffac818-54ac-45e0-928a-d01628afceac", "xan_t");
host.defineMidiPorts(1, 1);
host.addDeviceNameBasedDiscoveryPair(["Launchpad"], ["Launchpad"]);

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

var midiOut;
var selectedPad = null;

function init() {
    transport = host.createTransport();

    // Get MIDI output port
    midiOut = host.getMidiOutPort(0);
    println("MIDI Output port: " + (midiOut ? "Connected" : "NULL"));

    noteIn = host.getMidiInPort(0).createNoteInput("Launchpad", "??????");
    noteIn.setShouldConsumeEvents(false);

    host.getMidiInPort(0).setMidiCallback(onMidi);
    host.getMidiInPort(0).setSysexCallback(onSysex);

    // Enter Programmer Mode on Launchpad MK2
    // SysEx: F0h 00h 20h 29h 02h 18h 21h 01h F7h
    println("Sending SysEx to enter Programmer Mode...");
    midiOut.sendSysex("F0 00 20 29 02 18 21 01 F7");

    println("Launchpad MK2 initialized - ready for pad selection");
}

function selectPad(note) {
    // Check if this pad is in our config
    if (!padConfig[note]) {
        return;
    }

    // Turn off previously selected pad
    if (selectedPad !== null) {
        midiOut.sendMidi(0x90, selectedPad, colors.off);
    }

    // Light up new pad
    midiOut.sendMidi(0x90, note, colors.green);

    // Update state
    selectedPad = note;

    // Print to console
    println(padConfig[note] + " selected");
}

function onMidi(status, data1, data2) {
    printMidi(status, data1, data2);

    // Handle pad press (note on with velocity > 0)
    if (status === 0x90 && data2 > 0) {
        selectPad(data1);
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
        midiOut.sendMidi(0x90, i, 0);
    }

    // Return to Live mode on Launchpad MK2
    // SysEx: F0h 00h 20h 29h 02h 18h 21h 00h F7h
    midiOut.sendSysex("F0 00 20 29 02 18 21 00 F7");

    println("Launchpad Controller Script Exited");
}
