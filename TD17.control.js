loadAPI(24);

host.defineController("Generic", "TD-17 GGD Remapper", "1.0", "f8a3b2c1-4d5e-6f7a-8b9c-0d1e2f3a4b5c", "xan_t");
host.defineMidiPorts(1, 1);

load('TD17Remapper.js');

var remapper;

function init() {
    // Callback FIRST, before noteInput
    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        remapper.onMidi(status, data1, data2);
    });

    // Empty filter - accepts nothing by default
    var noteInput = host.getMidiInPort(0).createNoteInput("TD-17", "");

    remapper = new TD17RemapperHW({
        noteInput: noteInput,
        println: println
    });

    println("TD-17 GGD Remapper initialized");
}

function flush() {}

function exit() {
    println("TD-17 GGD Remapper exited");
}
