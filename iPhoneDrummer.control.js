loadAPI(24);

host.defineController("Generic", "iPhone Drummer Link", "1.0", "a7c3e1f0-5b2d-4a8e-9f6c-3d7e8b1a2c4f", "xan_t");
host.defineMidiPorts(1, 1);  // 1 input (from iPhone), 1 output (to iPhone)

load('MidiLink.js');

function init() {
    MidiLink = new MidiLinkHW({
        midiOutput: host.getMidiOutPort(0),
        host: host,
        println: println,
        onMessage: function(message) {
            if (message.growl) {
                host.showPopupNotification(message.growl);
            }
            println("MidiLink received: " + JSON.stringify(message));
        }
    });

    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        MidiLink.receive(status, data1, data2);
    });

    MidiLink.send({ growl: "Hello from Bitwig" });
    println("iPhone Drummer Link initialized");
}

function flush() {}

function exit() {
    println("iPhone Drummer Link exited");
}
