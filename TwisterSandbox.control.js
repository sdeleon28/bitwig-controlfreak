loadAPI(24);

host.defineController("Generic", "Twister Sandbox", "1.0", "b2c3d4e5-f6a7-8901-bcde-fa2345678901", "xan_t");
host.defineMidiPorts(1, 1);

var currentPage = 0;
var twisterOut;
var debouncing = false;

function trace(tag, msg) {
    println("[" + tag + "] " + msg);
}

function paintAll() {
    for (var cc = 0; cc < 64; cc++) {
        var colorIndex = currentPage * 64 + cc;
        twisterOut.sendMidi(0xB1, cc, colorIndex);
        twisterOut.sendMidi(0xB2, cc, 47);
    }
    trace("PAINT", "Painted page " + currentPage + " (colors " + (currentPage * 64) + "-" + (currentPage * 64 + 63) + ")");
}

function init() {
    trace("INIT", "TwisterSandbox starting up");

    twisterOut = host.getMidiOutPort(0);

    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        // Button press (channel 2 = 0xB1)
        if (status === 0xB1 && data2 > 0) {
            var cc = data1;
            var colorIndex = currentPage * 64 + cc;
            var bank = Math.floor(cc / 16) + 1;
            var encoderInBank = (cc % 16) + 1;

            println("");
            println("=== CC " + cc + " | Bank " + bank + ", Encoder " + encoderInBank + " | Page " + currentPage + " ===");
            println("  Color index: " + colorIndex);
            println("  Paint:      sendMidi(0xB1, " + cc + ", " + colorIndex + ")");
            println("  Brightness: sendMidi(0xB2, " + cc + ", 47)");
            println("");
            return;
        }

        // Encoder turn (channel 1 = 0xB0) — toggle page with debounce
        if (status === 0xB0) {
            if (debouncing) return;
            debouncing = true;

            currentPage = currentPage === 0 ? 1 : 0;
            paintAll();

            host.scheduleTask(function() {
                debouncing = false;
            }, null, 1000);
            return;
        }
    });

    paintAll();

    trace("INIT", "==================================================");
    trace("INIT", "TwisterSandbox ready.");
    trace("INIT", "  Page 0: colors 0-63    Page 1: colors 64-127");
    trace("INIT", "  Turn any encoder to toggle page.");
    trace("INIT", "  Press an encoder to print its paint instructions.");
    trace("INIT", "  Banks 1-4 = CCs 0-15, 16-31, 32-47, 48-63");
    trace("INIT", "==================================================");
}

function flush() {
    // Nothing to flush
}

function exit() {
    trace("EXIT", "TwisterSandbox shutting down");
}
