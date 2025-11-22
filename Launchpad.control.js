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

// Pad configuration: Map note numbers to mode labels (bottom-left 4x4 quadrant)
var padConfig = {
    // Row 0 (bottom)
    11: "volume", 12: "mode2",  13: "mode3",  14: "mode4",
    // Row 1
    21: "mode5",  22: "mode6",  23: "mode7",  24: "mode8",
    // Row 2
    31: "mode9",  32: "mode10", 33: "mode11", 34: "mode12",
    // Row 3
    41: "mode13", 42: "mode14", 43: "mode15", 44: "mode16"
};

// MIDI Fighter Twister color palette (approximate indices based on available colors)
var twisterColors = [
    {idx: 0,   r: 0,   g: 0,   b: 0},      // Black/Off
    {idx: 1,   r: 40,  g: 40,  b: 40},     // Dark gray
    {idx: 5,   r: 0,   g: 0,   b: 200},    // Blue
    {idx: 7,   r: 0,   g: 150, b: 255},    // Light blue
    {idx: 9,   r: 0,   g: 200, b: 200},    // Cyan
    {idx: 11,  r: 0,   g: 255, b: 150},    // Cyan-green
    {idx: 13,  r: 0,   g: 255, b: 0},      // Green
    {idx: 15,  r: 150, g: 255, b: 0},      // Lime
    {idx: 17,  r: 255, g: 255, b: 0},      // Yellow
    {idx: 19,  r: 255, g: 180, b: 0},      // Gold
    {idx: 21,  r: 255, g: 100, b: 0},      // Orange
    {idx: 23,  r: 255, g: 50,  b: 0},      // Red-orange
    {idx: 25,  r: 255, g: 0,   b: 0},      // Red
    {idx: 27,  r: 255, g: 0,   b: 100},    // Pink-red
    {idx: 29,  r: 255, g: 0,   b: 200},    // Pink
    {idx: 31,  r: 255, g: 0,   b: 255},    // Magenta
    {idx: 33,  r: 200, g: 0,   b: 255},    // Purple-magenta
    {idx: 35,  r: 150, g: 0,   b: 255},    // Purple
    {idx: 37,  r: 100, g: 0,   b: 200}     // Dark purple
];

var launchpadOut;
var twisterOut;
var selectedPad = null;

// Bitwig API objects
var trackBank;
var trackDepths = []; // Store track depths detected during init

function calculateTrackDepths() {
    // Calculate depths based on naming convention:
    // - "top xxx" groups are depth 0
    // - Tracks after "top" group are depth 1
    // - Tracks after a depth-1 group are depth 2

    var currentTopGroup = -1;  // Index of current top-level group
    var currentChildGroup = -1;  // Index of current child group

    for (var i = 0; i < 64; i++) {
        var track = trackBank.getItemAt(i);
        if (!track.exists().get()) {
            trackDepths[i] = 0;
            continue;
        }

        var trackName = track.name().get();
        var isGroup = track.isGroup().get();

        // Check if this is a top-level group
        if (trackName && trackName.toLowerCase().indexOf("top ") === 0) {
            trackDepths[i] = 0;
            currentTopGroup = i;
            currentChildGroup = -1;  // Reset child group
            println("[" + i + "] '" + trackName + "' -> depth 0 (top group)");
        }
        // Check if this is a child group (depth 1 group)
        else if (isGroup && currentTopGroup >= 0) {
            trackDepths[i] = 1;
            currentChildGroup = i;
            println("[" + i + "] '" + trackName + "' -> depth 1 (child group)");
        }
        // Regular track - determine depth based on parent groups
        else {
            if (currentChildGroup >= 0) {
                // We're inside a child group
                trackDepths[i] = 2;
                println("[" + i + "] '" + trackName + "' -> depth 2 (inside child group)");
            } else if (currentTopGroup >= 0) {
                // We're inside a top group but not a child group
                trackDepths[i] = 1;
                println("[" + i + "] '" + trackName + "' -> depth 1 (inside top group)");
            } else {
                // No parent group
                trackDepths[i] = 0;
                println("[" + i + "] '" + trackName + "' -> depth 0 (no parent)");
            }
        }
    }
}

function buildTrackTree() {
    // Build hierarchical tree from trackBank using pre-calculated depths
    var tree = [];
    var parentStack = [{ children: tree }]; // Stack to track parents at each level

    for (var i = 0; i < 64; i++) {
        var track = trackBank.getItemAt(i);

        if (!track.exists().get()) {
            continue;
        }

        var trackInfo = {
            index: i,
            name: track.name().get(),
            isGroup: track.isGroup().get(),
            depth: trackDepths[i] || 0,
            children: []
        };

        // Truncate parent stack to current depth
        parentStack.length = trackInfo.depth + 1;

        // Get parent (at depth level)
        var parent = parentStack[trackInfo.depth] || parentStack[0];

        // Add to parent's children
        parent.children.push(trackInfo);

        // Update stack for this depth level
        parentStack[trackInfo.depth + 1] = trackInfo;
    }

    return tree;
}

function printTrack(track, indent) {
    // Print track with indentation
    var indentStr = "";
    for (var i = 0; i < indent; i++) {
        indentStr += "  ";
    }

    var line = indentStr + "[" + track.index + "] " + track.name;
    if (track.isGroup) {
        line += " (GROUP)";
    }
    line += " - depth = " + track.depth;

    println(line);

    // Recursively print children
    for (var j = 0; j < track.children.length; j++) {
        printTrack(track.children[j], indent + 1);
    }
}

function printTrackTree(tree) {
    println("=== TRACK TREE ===");

    for (var i = 0; i < tree.length; i++) {
        printTrack(tree[i], 0);
    }

    println("=== END TREE ===");
}

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

    // Create main track bank to access all tracks (flat list including nested tracks)
    trackBank = host.createMainTrackBank(64, 0, 0);

    // Subscribe to all track properties
    for (var i = 0; i < 64; i++) {
        var track = trackBank.getItemAt(i);
        track.exists().markInterested();
        track.name().markInterested();
        track.isGroup().markInterested();
        track.solo().markInterested();
        track.color().markInterested();

        // Add volume observer to update encoder LEDs in real-time
        (function(trackIndex) {
            trackBank.getItemAt(trackIndex).volume().addValueObserver(128, function(value) {
                // When volume changes, find which encoder(s) map to this track and update them
                var trackName = trackBank.getItemAt(trackIndex).name().get();

                // Check each CC 0-15 to see if this track is mapped to it
                for (var cc = 0; cc < 16; cc++) {
                    var searchString = "(" + cc + ")";
                    if (trackName.indexOf(searchString) !== -1) {
                        updateEncoderLED(cc, value);
                    }
                }
            });

            // Add color observer to update encoder colors in real-time
            trackBank.getItemAt(trackIndex).color().addValueObserver(function(red, green, blue) {
                // When color changes, find which encoder(s) map to this track and update them
                var trackName = trackBank.getItemAt(trackIndex).name().get();
                var redMidi = Math.round(red * 255);
                var greenMidi = Math.round(green * 255);
                var blueMidi = Math.round(blue * 255);

                // Check each CC 0-15 to see if this track is mapped to it
                for (var cc = 0; cc < 16; cc++) {
                    var searchString = "(" + cc + ")";
                    if (trackName.indexOf(searchString) !== -1) {
                        updateEncoderColor(cc, redMidi, greenMidi, blueMidi);
                    }
                }
            });
        })(i);
    }

    // Enter Programmer Mode on Launchpad MK2
    // SysEx: F0h 00h 20h 29h 02h 18h 21h 01h F7h
    launchpadOut.sendSysex("F0 00 20 29 02 18 21 01 F7");

    // Auto-select "volume" mode on startup
    selectPad(11);
    println("Volume mode selected on startup");

    // Build and print track tree for debugging (delayed to allow track bank to populate)
    host.scheduleTask(function() {
        println("=== Calculating track depths ===");
        calculateTrackDepths();
        println("=== Building track tree ===");
        var tree = buildTrackTree();
        printTrackTree(tree);
    }, null, 100);  // Wait 100ms for track bank to populate
}

// Encoder LED feedback functions
function updateEncoderLED(ccNumber, value) {
    // Send CC on channel 0 to update encoder LED ring
    twisterOut.sendMidi(0xB0, ccNumber, value);
}

function rgbToHue(r, g, b) {
    // Convert RGB (0-255) to HSV hue (0-360)
    r = r / 255;
    g = g / 255;
    b = b / 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;

    if (delta === 0) {
        return 0; // Gray/black/white - no hue
    }

    var hue;
    if (max === r) {
        hue = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
        hue = 60 * (((b - r) / delta) + 2);
    } else {
        hue = 60 * (((r - g) / delta) + 4);
    }

    if (hue < 0) {
        hue += 360;
    }

    return hue;
}

function findClosestColorIndex(r, g, b) {
    // Convert RGB to hue and map to MF Twister color index (0-127)
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var saturation = (max === 0) ? 0 : (max - min) / max;
    var hue = rgbToHue(r, g, b);

    // Log color info for debugging
    println("Color: RGB(" + r + ", " + g + ", " + b +
            ") Hue: " + hue.toFixed(1) +
            "° Sat: " + saturation.toFixed(2) +
            " Bright: " + max);

    // Special case: Grayscale colors (low saturation)
    if (saturation < 0.15) {
        println("  -> Grayscale detected");
        // TODO: Find correct grayscale index
        return 0;
    }

    // Special case: Purple colors (hue 270-330°)
    // Purple seems to be in a different range - try mapping to higher indices for darker purples
    if (hue >= 270 && hue <= 330) {
        println("  -> Purple detected, hue: " + hue.toFixed(1));
        // Map purple (270-330°) to indices around 105-120 for darker purples
        var purpleRange = hue - 270;  // 0-60
        var colorIndex = Math.round(105 + (purpleRange * 15 / 60));
        println("  -> Purple mapped to index: " + colorIndex);
        return colorIndex;
    }

    // Map hue (0-360) to color index (0-127)
    // MF Twister uses inverted hue + 240° rotation
    var invertedHue = 360 - hue;
    var adjustedHue = (invertedHue + 240) % 360;
    var colorIndex = Math.round(adjustedHue * 127 / 360);

    println("  -> Index: " + colorIndex);

    return colorIndex;
}

function updateEncoderColor(ccNumber, red, green, blue) {
    // Find closest color index in MF Twister palette
    var colorIndex = findClosestColorIndex(red, green, blue);

    // Send color index on channel 2 (RGB indicator channel)
    twisterOut.sendMidi(0xB1, ccNumber, colorIndex);
}

function clearEncoderLEDs() {
    // Turn off all encoder LEDs and colors
    for (var i = 0; i < 16; i++) {
        updateEncoderLED(i, 0);
        updateEncoderColor(i, 0, 0, 0); // Clear color (black)
    }
    println("Encoder LEDs and colors cleared");
}

function syncEncoderToTrack(ccNumber) {
    // Find track with (CC#) in name and sync encoder LED value and color
    var track = findTrackByCC(ccNumber);

    if (track) {
        // Sync volume value
        var volumeValue = track.volume().get();
        var midiValue = Math.round(volumeValue * 127);
        updateEncoderLED(ccNumber, midiValue);

        // Sync track color
        var color = track.color();
        var red = Math.round(color.red() * 255);
        var green = Math.round(color.green() * 255);
        var blue = Math.round(color.blue() * 255);
        updateEncoderColor(ccNumber, red, green, blue);
    } else {
        // No track mapped - turn off encoder LED and color
        updateEncoderLED(ccNumber, 0);
        updateEncoderColor(ccNumber, 0, 0, 0);
    }
}

function syncAllEncoders() {
    // Sync all 16 encoders to their mapped tracks
    println("Syncing all encoder LEDs...");
    for (var i = 0; i < 16; i++) {
        syncEncoderToTrack(i);
    }
}

function selectPad(note) {
    // Check if this pad is in our config
    if (!padConfig[note]) {
        return;
    }

    // Clear encoder LEDs when switching modes
    clearEncoderLEDs();

    // Turn off previously selected pad
    if (selectedPad !== null) {
        launchpadOut.sendMidi(0x90, selectedPad, colors.off);
    }

    // Light up new pad
    launchpadOut.sendMidi(0x90, note, colors.green);

    // Update state
    selectedPad = note;

    // Sync encoder LEDs to track volumes for new mode
    syncAllEncoders();
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
    // Turn off all encoder LEDs
    clearEncoderLEDs();

    // Turn off all pads
    for (var i = 0; i < 128; i++) {
        launchpadOut.sendMidi(0x90, i, 0);
    }

    // Return to Live mode on Launchpad MK2
    // SysEx: F0h 00h 20h 29h 02h 18h 21h 00h F7h
    launchpadOut.sendSysex("F0 00 20 29 02 18 21 00 F7");
}
