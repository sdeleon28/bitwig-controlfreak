loadAPI(24);

host.defineController("Generic", "Frequalizer Twister Sandbox", "1.0", "b2c3d4e5-f6a7-8901-bcde-f12345678901", "xan_t");
host.defineMidiPorts(1, 1);  // 1 input (Twister), 1 output (Twister)

load('FrequalizerDevice.js');
load('TwisterPainter.js');
load('FrequalizerTwisterMapper.js');

function trace(tag, msg) {
    println("[" + tag + "] " + msg);
}

function init() {
    trace("INIT", "FrequalizerTwisterSandbox starting up");

    var twisterOut = host.getMidiOutPort(0);

    // --- Cursor Track & Device ----------------------------------------------
    var cursorTrack = host.createCursorTrack("freq-twister-cursor", "FreqTwister Cursor", 0, 0, true);
    var cursorDevice = cursorTrack.createCursorDevice();

    cursorTrack.name().markInterested();
    cursorDevice.name().markInterested();
    cursorDevice.exists().markInterested();

    cursorTrack.name().addValueObserver(function(name) {
        trace("CURSOR-TRACK", "Track: " + name);
    });

    cursorDevice.name().addValueObserver(function(name) {
        trace("DEVICE", "Device: " + name);
    });

    // --- Mapper setup -------------------------------------------------------
    var device = new FrequalizerDevice({ println: println });
    var painter = new TwisterPainter({ midiOutput: twisterOut });
    var mapper = new FrequalizerTwisterMapper({ device: device, painter: painter, println: println });

    // --- Twister MIDI input ---------------------------------------------------
    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        var encoder = painter.ccToEncoder(data1);

        // Encoder turns (channel 0)
        if (status === 0xB0) {
            var paramId = mapper.encoderParamId(encoder);
            if (paramId) {
                cursorDevice.setDirectParameterValueNormalized(paramId, data2, 128);
                trace("TURN", "encoder " + encoder + " -> " + paramId + " = " + data2);
            }
            return;
        }

        // Encoder clicks (channel 1)
        if (status === 0xB1) {
            var pressed = data2 > 0;

            if (pressed) {
                var toggle = mapper.handleClick(encoder);
                if (toggle) {
                    cursorDevice.setDirectParameterValueNormalized(toggle.paramId, toggle.value, toggle.resolution);
                    trace("TOGGLE", "encoder " + encoder + " -> " + toggle.paramId + " = " + toggle.value);
                }
            }

            var hold = mapper.handleHold(encoder, pressed);
            if (hold) {
                cursorDevice.setDirectParameterValueNormalized(hold.paramId, hold.value, hold.resolution);
                trace("SOLO", "encoder " + encoder + " -> " + hold.paramId + " = " + hold.value);
            }
        }
    });

    // --- Direct Parameter Observer -------------------------------------------
    cursorDevice.addDirectParameterIdObserver(function(ids) {
        trace("DIRECT-IDS", "Got " + ids.length + " parameter IDs");
    });

    cursorDevice.addDirectParameterNormalizedValueObserver(function(id, value) {
        var normalizedId = id.replace('ROOT_GENERIC_MODULE/', '');
        if (mapper.feed(normalizedId, value)) {
            trace("MAPPER", normalizedId + " = " + value);
        }
    });

    trace("INIT", "FrequalizerTwisterSandbox ready.");
    trace("INIT", "Select a track with Frequalizer, toggle Lowest band on/off.");
    trace("INIT", "Encoders 13+14 should light red / go dark.");
}

function flush() {}

function exit() {
    trace("EXIT", "FrequalizerTwisterSandbox shutting down");
}
