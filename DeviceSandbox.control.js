loadAPI(24);

host.defineController("Generic", "Device Sandbox", "1.0", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "xan_t");
host.defineMidiPorts(1, 1);  // 1 input (Twister), 1 output (Twister)

load('FrequalizerDevice.js');

// ============================================================================
// Device Parameter Observation — Findings
//
// WHAT WORKS:
//   addDirectParameterNormalizedValueObserver [DIRECT-VALUE]
//     - Fires for ALL parameters on the active device (not just remote-mapped)
//     - Param IDs arrive prefixed with ROOT_GENERIC_MODULE/
//       e.g. "CONTENTS/ROOT_GENERIC_MODULE/PID10cd7bbf"
//     - Must strip ROOT_GENERIC_MODULE/ to match canonical IDs in DeviceMappings
//     - Boolean params (Active) fire as 0.0 / 1.0
//     - Enum params (Mode, Band Solo) fire as normalized fractions
//       e.g. Mode: 0.0=Stereo, 0.25=Mid, 0.5=Side, 0.75=MidSolo, 1.0=SideSolo
//     - Continuous params (Frequency, Gain, Quality) fire as normalized 0–1
//
//   Also useful:
//     addDirectParameterIdObserver     — full list of param IDs on device load
//     addDirectParameterNameObserver   — maps ID → human-readable name
//     addDirectParameterValueDisplayObserver — formatted display string
//
// WHAT DID NOT FIRE for Frequalizer param changes:
//   - CursorRemoteControlsPage (approaches 2–4): only fires for remote-mapped params
//   - Legacy page observers (approach 5): deprecated, no output
//   - SpecificBitwigDevice (approach 6): requires known UUID, not useful for plugins
//   - Device metadata observers (approach 7): static info, not param values
//   - DeviceBank (approach 8): device list, not param values
//   - Track-level remote controls (approach 9): no output
//   - Raw value observer (approach 10): only on remote controls
//   - Device position (approach 11): chain position, not param values
// ============================================================================

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

var twisterOut;

function trace(tag, msg) {
    println("[" + tag + "] " + msg);
}

function init() {
    trace("INIT", "DeviceSandbox starting up");

    // --- Twister I/O --------------------------------------------------------
    twisterOut = host.getMidiOutPort(0);

    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        trace("TWISTER-IN", "status=" + status + " data1=" + data1 + " data2=" + data2);
    });

    // --- Cursor Track & Device ----------------------------------------------
    var cursorTrack = host.createCursorTrack("sandbox-cursor", "Sandbox Cursor", 0, 0, true);
    var cursorDevice = cursorTrack.createCursorDevice();

    cursorTrack.name().markInterested();
    cursorTrack.name().addValueObserver(function(name) {
        trace("CURSOR-TRACK", "Track name: " + name);
    });

    cursorDevice.name().markInterested();
    cursorDevice.exists().markInterested();

    cursorDevice.name().addValueObserver(function(name) {
        trace("DEVICE-NAME", "Device: " + name);
    });

    cursorDevice.exists().addValueObserver(function(exists) {
        trace("DEVICE-EXISTS", "exists=" + exists);
    });

    // --- Frequalizer Device Abstraction -------------------------------------
    var frequalizerDevice = new FrequalizerDevice();

    frequalizerDevice.onBandSoloed(function(band) {
        trace("FREQ", "Band Solo = " + (band === null ? "None" : band));
    });

    frequalizerDevice.onModeChanged(function(mode) {
        trace("FREQ", "Mode = " + mode);
    });

    frequalizerDevice.onBandActiveChanged(function(band, isActive) {
        trace("FREQ", band + " Active = " + (isActive ? "ON" : "OFF"));
    });

    // --- Direct Parameter Observers (the only approach that works) ----------

    var directParamNames = {};

    cursorDevice.addDirectParameterIdObserver(function(ids) {
        trace("DIRECT-IDS", "Got " + ids.length + " parameter IDs");
        for (var i = 0; i < Math.min(ids.length, 10); i++) {
            trace("DIRECT-IDS", "  [" + i + "] " + ids[i]);
        }
        if (ids.length > 10) {
            trace("DIRECT-IDS", "  ... (" + (ids.length - 10) + " more)");
        }
    });

    cursorDevice.addDirectParameterNameObserver(64, function(id, name) {
        var normalizedId = id.replace('ROOT_GENERIC_MODULE/', '');
        directParamNames[normalizedId] = name;
    });

    cursorDevice.addDirectParameterNormalizedValueObserver(function(id, value) {
        var normalizedId = id.replace('ROOT_GENERIC_MODULE/', '');

        if (!frequalizerDevice.feed(normalizedId, value)) {
            var name = directParamNames[normalizedId] || "?";
            trace("DIRECT-VALUE", normalizedId + " (" + name + ") = " + value);
        }
    });

    // --- LED feedback: confirm script is running ----------------------------
    try {
        twisterOut.sendMidi(0xB1, 0, 65);  // Encoder 0 = blue
        twisterOut.sendMidi(0xB2, 0, 47);  // Full brightness
        trace("INIT", "Twister LED confirmation sent on encoder 0");
    } catch(e) {
        trace("INIT", "Twister LED failed: " + e);
    }

    trace("INIT", "==================================================");
    trace("INIT", "DeviceSandbox ready. Select a device in Bitwig,");
    trace("INIT", "then move a parameter. Check console for output.");
    trace("INIT", "  [FREQ]         = matched Frequalizer param");
    trace("INIT", "  [DIRECT-VALUE] = unmatched param (raw fallback)");
    trace("INIT", "==================================================");
}

function flush() {
    // Nothing to flush
}

function exit() {
    trace("EXIT", "DeviceSandbox shutting down");
}
