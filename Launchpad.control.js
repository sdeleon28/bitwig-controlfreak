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

var midiOut;

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

    println("Launchpad MK2 set to Programmer Mode");

    // Light up bottom-left pad (note 11 on MK2, which is first pad of bottom row)
    println("Sending MIDI: 0x90, 11, " + colors.green);
    midiOut.sendMidi(0x90, 11, colors.green);

    println("Bottom-left pad should now be lit up with green color");
}

function onMidi(status, data1, data2) {
    printMidi(status, data1, data2);
    if (status === 0x90 && data1 === 11) {
        println("Bottom-left pad pressed!");
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
