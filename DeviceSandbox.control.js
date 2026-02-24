loadAPI(24);

host.defineController("Generic", "Device Sandbox", "1.0", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "xan_t");
host.defineMidiPorts(1, 1);  // 1 input (Twister), 1 output (Twister)

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
// Frequalizer Parameter Registry
// Maps canonical param IDs (without ROOT_GENERIC_MODULE/) to descriptors.
// Unmatched params fall through to raw [DIRECT-VALUE] logging.
// ---------------------------------------------------------------------------
var FREQ_PARAMS = {
    // Band 1 (Lowest)
    'CONTENTS/PID5e65eb21': { name: 'Q1: Frequency', type: 'continuous' },
    'CONTENTS/PID1fdbd404': { name: 'Q1: Quality',   type: 'continuous' },
    'CONTENTS/PID60a37761': { name: 'Q1: Active',    type: 'bool' },
    'CONTENTS/PID1372e255': { name: 'Q1: Filter Type', type: 'enum' },

    // Band 2 (Low)
    'CONTENTS/PID47f82203': { name: 'Q2: Frequency', type: 'continuous' },
    'CONTENTS/PID74f25b66': { name: 'Q2: Quality',   type: 'continuous' },
    'CONTENTS/PID14682278': { name: 'Q2: Gain',      type: 'continuous' },
    'CONTENTS/PID10cd7bbf': { name: 'Q2: Active',    type: 'bool' },
    'CONTENTS/PID146e6633': { name: 'Q2: Filter Type', type: 'enum' },

    // Band 3 (Low Mids)
    'CONTENTS/PID7f826bc6': { name: 'Q3: Frequency', type: 'continuous' },
    'CONTENTS/PIDefa39e9':  { name: 'Q3: Quality',   type: 'continuous' },
    'CONTENTS/PID9318ad5':  { name: 'Q3: Gain',      type: 'continuous' },
    'CONTENTS/PID78de40dc': { name: 'Q3: Active',    type: 'bool' },
    'CONTENTS/PID937ce90':  { name: 'Q3: Filter Type', type: 'enum' },

    // Band 4 (High Mids)
    'CONTENTS/PID5f199778': { name: 'Q4: Frequency', type: 'continuous' },
    'CONTENTS/PID416caa1b': { name: 'Q4: Quality',   type: 'continuous' },
    'CONTENTS/PID1d7657e3': { name: 'Q4: Gain',      type: 'continuous' },
    'CONTENTS/PIDf24026a':  { name: 'Q4: Active',    type: 'bool' },
    'CONTENTS/PID1d7c9b9e': { name: 'Q4: Filter Type', type: 'enum' },

    // Band 5 (High)
    'CONTENTS/PID5c3cef11': { name: 'Q5: Frequency', type: 'continuous' },
    'CONTENTS/PID2a8313f4': { name: 'Q5: Quality',   type: 'continuous' },
    'CONTENTS/PID4b5ee4aa': { name: 'Q5: Gain',      type: 'continuous' },
    'CONTENTS/PID651c7971': { name: 'Q5: Active',    type: 'bool' },
    'CONTENTS/PID4b652865': { name: 'Q5: Filter Type', type: 'enum' },

    // Band 6 (Highest)
    'CONTENTS/PID10d85b53': { name: 'Q6: Frequency', type: 'continuous' },
    'CONTENTS/PID1430a8b6': { name: 'Q6: Quality',   type: 'continuous' },
    'CONTENTS/PID74e8446f': { name: 'Q6: Active',    type: 'bool' },
    'CONTENTS/PID49039ae3': { name: 'Q6: Filter Type', type: 'enum' },

    // Global
    'CONTENTS/PID3339a3':   { name: 'Mode',       type: 'enum', values: ['Stereo', 'Mid', 'Side', 'MidSolo', 'SideSolo'] },
    'CONTENTS/PID68f7bbb':  { name: 'Fullscreen', type: 'bool' },
    'CONTENTS/PID10cd4cb4': { name: 'Band Solo',  type: 'enum', resolution: 19 },
    'CONTENTS/PID73e3d569': { name: 'Mid Output',  type: 'continuous' },
    'CONTENTS/PIDd504538':  { name: 'Side Output', type: 'continuous' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

var twisterOut;

function trace(tag, msg) {
    println("[" + tag + "] " + msg);
}

/**
 * Decode and log a param change using the FREQ_PARAMS registry.
 * Returns true if the param was matched, false otherwise.
 */
function watchParam(id, value) {
    var desc = FREQ_PARAMS[id];
    if (!desc) return false;

    var display;
    if (desc.type === 'bool') {
        display = desc.name + " = " + (value >= 0.5 ? "ON" : "OFF");
    } else if (desc.type === 'enum' && desc.values) {
        var index = Math.round(value * (desc.values.length - 1));
        display = desc.name + " = " + desc.values[index];
    } else if (desc.type === 'enum') {
        display = desc.name + " = " + value.toFixed(4) + " (enum)";
    } else {
        display = desc.name + " = " + value.toFixed(4);
    }

    trace("FREQ", display);
    return true;
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

        if (!watchParam(normalizedId, value)) {
            var name = directParamNames[normalizedId] || "?";
            trace("DIRECT-VALUE", normalizedId + " (" + name + ") = " + value);
        }
    });

    cursorDevice.addDirectParameterValueDisplayObserver(64, function(id, displayValue) {
        var normalizedId = id.replace('ROOT_GENERIC_MODULE/', '');
        var desc = FREQ_PARAMS[normalizedId];
        if (desc) {
            trace("FREQ-DISPLAY", desc.name + " display='" + displayValue + "'");
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
