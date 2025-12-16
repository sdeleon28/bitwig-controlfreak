loadAPI(24);

host.defineController("Generic", "Launchpad + Twister", "1.0", "3ffac818-54ac-45e0-928a-d01628afceac", "xan_t");
host.defineMidiPorts(4, 2);  // 4 inputs (Launchpad, Twister, Roland Piano, nanoKEY2), 2 outputs

// Debug flag - set to true to enable verbose logging
var debug = false;

// Load external modules
// Layer 1: Foundation
load('Bitwig.js');
load('Pages.js');

// Layer 2: Hardware abstraction
load('Launchpad.js');
load('Twister.js');
load('RolandPiano.js');
load('NanoKey2.js');

// Layer 3: Isolation
load('Pager.js');
load('Animations.js');

// Layer 4: UI components
load('LaunchpadQuadrant.js');
load('LaunchpadModeSwitcher.js');
load('LaunchpadLane.js');
load('ProjectExplorer.js');
load('LaunchpadTopButtons.js');
load('ClipLauncher.js');
load('ClipGestures.js');

// Layer 5: Page implementations
load('Page_MainControl.js');
load('Page_ClipLauncher.js');
load('Page_MarkerManager.js');

// Layer 6: Orchestrator
load('Controller.js');

// ============================================================================
// Namespace Structure
// ============================================================================

/**
 * @typedef {Object} BitwigTrack
 * @property {number} id - Track index in bank (0-63)
 * @property {string} name - Track name
 * @property {boolean} isGroup - Whether track is a group
 * @property {number} depth - Hierarchy depth (0=top, 1=child, 2=grandchild)
 * @property {BitwigTrack[]} children - Child tracks
 */

/**
 * @typedef {Object} BitwigColor
 * @property {number} red - Red component (0-1)
 * @property {number} green - Green component (0-1)
 * @property {number} blue - Blue component (0-1)
 */

/**
 * @typedef {Object} TwisterColor
 * @property {number} idx - MIDI color index
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255)
 * @property {number} b - Blue component (0-255)
 */

// ============================================================================
// Global Variables (to be refactored)
// ============================================================================

var launchpadOut;
var twisterOut;

// Bitwig API objects
var trackBank;
var trackDepths = []; // Store track depths detected during init

function calculateTrackDepths() {
    // Calculate depths based on naming convention:
    // - "top xxx" groups are depth 0
    // - Tracks after "top" group are depth 1
    // - Tracks after a depth-1 group are depth 2

    var depths = [];
    var currentTopGroup = -1;  // Index of current top-level group
    var currentChildGroup = -1;  // Index of current child group

    for (var i = 0; i < 64; i++) {
        var track = Bitwig.getTrack(i);
        if (!track) {
            depths[i] = 0;
            continue;
        }

        var trackName = track.name().get();
        var isGroup = track.isGroup().get();

        // Check if this is a top-level group
        if (trackName && trackName.toLowerCase().indexOf("top ") === 0) {
            depths[i] = 0;
            currentTopGroup = i;
            currentChildGroup = -1;  // Reset child group
            if (debug) println("[" + i + "] '" + trackName + "' -> depth 0 (top group)");
        }
        // Check if this is a child group (depth 1 group)
        else if (isGroup && currentTopGroup >= 0) {
            depths[i] = 1;
            currentChildGroup = i;
            if (debug) println("[" + i + "] '" + trackName + "' -> depth 1 (child group)");
        }
        // Regular track - determine depth based on parent groups
        else {
            if (currentChildGroup >= 0) {
                // We're inside a child group
                depths[i] = 2;
                if (debug) println("[" + i + "] '" + trackName + "' -> depth 2 (inside child group)");
            } else if (currentTopGroup >= 0) {
                // We're inside a top group but not a child group
                depths[i] = 1;
                if (debug) println("[" + i + "] '" + trackName + "' -> depth 1 (inside top group)");
            } else {
                // No parent group
                depths[i] = 0;
                if (debug) println("[" + i + "] '" + trackName + "' -> depth 0 (no parent)");
            }
        }
    }

    // Store depths in Bitwig namespace
    Bitwig.setTrackDepths(depths);
}


function printTrack(track, indent) {
    // Print track with indentation
    var indentStr = "";
    for (var i = 0; i < indent; i++) {
        indentStr += "  ";
    }

    var line = indentStr + "[" + track.id + "] " + track.name;
    if (track.isGroup) {
        line += " (GROUP)";
    }
    line += " - depth = " + track.depth;

    if (debug) println(line);

    // Recursively print children
    for (var j = 0; j < track.children.length; j++) {
        printTrack(track.children[j], indent + 1);
    }
}

function printTrackTree(tree) {
    if (debug) {
        println("=== TRACK TREE ===");

        for (var i = 0; i < tree.length; i++) {
            printTrack(tree[i], 0);
        }

        println("=== END TREE ===");
    }
}

function init() {
    transport = host.createTransport();

    // Launchpad on port 0
    launchpadOut = host.getMidiOutPort(0);
    launchpadOut.setShouldSendMidiBeatClock(true);  // Sync flashing/pulsing to project BPM
    Launchpad.init(launchpadOut);

    noteIn = host.getMidiInPort(0).createNoteInput("Launchpad", "??????");
    noteIn.setShouldConsumeEvents(false);

    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        printMidi(status, data1, data2);
        Controller.onLaunchpadMidi(status, data1, data2);
    });
    host.getMidiInPort(0).setSysexCallback(onSysex);

    // MIDI Fighter Twister on port 1
    twisterOut = host.getMidiOutPort(1);
    Twister.init(twisterOut);

    host.getMidiInPort(1).setMidiCallback(function(status, data1, data2) {
        Controller.onTwisterMidi(status, data1, data2);
    });

    // Create main track bank to access all tracks (flat list including nested tracks)
    // 64 tracks, 8 sends (for FX routing), 0 scenes
    trackBank = host.createMainTrackBank(64, 8, 0);

    // Create effect track bank to access FX/return tracks
    // 8 effect tracks, 0 scenes
    var effectTrackBank = host.createEffectTrackBank(8, 0);

    // Initialize Bitwig namespace with track bank and transport
    Bitwig.init(trackBank, transport);
    Bitwig._effectTrackBank = effectTrackBank;

    // Subscribe to track properties for tree building
    for (var i = 0; i < 64; i++) {
        var track = trackBank.getItemAt(i);
        track.exists().markInterested();
        track.name().markInterested();
        track.isGroup().markInterested();
        track.solo().markInterested();
        track.color().markInterested();
        track.volume().markInterested();

        // Add name change observer with closure to capture track ID
        (function(trackId, trackObj) {
            trackObj.name().addValueObserver(function(name) {
                // Only handle name changes after initial load
                if (name && name !== "") {
                    Controller.handleTrackNameChange(trackId, name);
                }
            });

            // Add volume observer that checks for encoder links
            trackObj.volume().addValueObserver(128, function(value) {
                var encoderNumber = Twister._trackToEncoder[trackId];
                if (encoderNumber && LaunchpadModeSwitcher.getEncoderMode() === 'volume') {
                    Twister.setEncoderLED(encoderNumber, value);
                }
            });

            // Add pan observer that checks for encoder links
            trackObj.pan().markInterested();
            trackObj.pan().addValueObserver(128, function(value) {
                var encoderNumber = Twister._trackToEncoder[trackId];
                if (encoderNumber && LaunchpadModeSwitcher.getEncoderMode() === 'pan') {
                    Twister.setEncoderLED(encoderNumber, value);
                }
            });

            // Add send observers for bi-directional sync in Send A mode
            var sendBank = trackObj.sendBank();
            for (var s = 0; s < 8; s++) {
                (function(tid, sendIndex) {
                    var send = sendBank.getItemAt(sendIndex);
                    send.value().markInterested();
                    send.value().addValueObserver(128, function(value) {
                        var key = tid + '_' + sendIndex;
                        var encoderNum = Twister._sendToEncoder ? Twister._sendToEncoder[key] : null;
                        if (encoderNum && LaunchpadModeSwitcher.getPadMode() === 'sendA') {
                            Twister.setEncoderLED(encoderNum, value);
                        }
                    });
                })(trackId, s);
            }

            // Add mute observer for track grid
            trackObj.mute().markInterested();
            trackObj.mute().addValueObserver(function(isMuted) {
                var padNumber = Launchpad._padToTrack[trackId];
                if (padNumber) {
                    var color = Launchpad.getTrackGridPadColor(trackId);
                    Launchpad.setPadColor(padNumber, color);
                }
            });

            // Add solo observer for track grid
            trackObj.solo().markInterested();
            trackObj.solo().addValueObserver(function(isSoloed) {
                var padNumber = Launchpad._padToTrack[trackId];
                if (padNumber) {
                    var color = Launchpad.getTrackGridPadColor(trackId);
                    Launchpad.setPadColor(padNumber, color);
                }
            });

            // Add record arm observer for track grid
            trackObj.arm().markInterested();
            trackObj.arm().addValueObserver(function(isArmed) {
                var padNumber = Launchpad._padToTrack[trackId];
                if (padNumber) {
                    var color = Launchpad.getTrackGridPadColor(trackId);
                    Launchpad.setPadColor(padNumber, color);
                }
            });

            // Add color observer that checks for encoder and pad links
            trackObj.color().addValueObserver(function(red, green, blue) {
                // Update encoder colors
                var encoderNumber = Twister._trackToEncoder[trackId];
                if (encoderNumber) {
                    var redMidi = Math.round(red * 255);
                    var greenMidi = Math.round(green * 255);
                    var blueMidi = Math.round(blue * 255);
                    Twister.setEncoderColor(encoderNumber, redMidi, greenMidi, blueMidi);
                }

                // Update pad colors - only for group selector pads
                // Track grid pads are handled by Controller.refreshTrackGrid (based on pad mode)
                var padNumber = Launchpad._padToTrack[trackId];
                if (padNumber) {
                    // Check if this is a group selector pad
                    var isGroupSelector = LaunchpadQuadrant.bottomRight.getGroup(padNumber) !== null;

                    if (isGroupSelector) {
                        // Group selector pad - use bright/dim based on selection
                        var launchpadColor = Launchpad.bitwigColorToLaunchpad(red, green, blue);

                        if (Controller.selectedGroup &&
                            LaunchpadQuadrant.bottomRight.getGroup(padNumber) === Controller.selectedGroup) {
                            var brightColor = Launchpad.getBrightnessVariant(launchpadColor, Launchpad.brightness.bright);
                            Launchpad.setPadColor(padNumber, brightColor);
                        } else {
                            var dimColor = Launchpad.getBrightnessVariant(launchpadColor, Launchpad.brightness.dim);
                            Launchpad.setPadColor(padNumber, dimColor);
                        }
                    }
                    // Track grid pads: don't update here - refreshTrackGrid handles them
                }
            });
        })(i, track);
    }

    // Set up effect track observers and cache FX tracks on startup
    for (var e = 0; e < 8; e++) {
        var effectTrack = effectTrackBank.getItemAt(e);
        effectTrack.name().markInterested();
        effectTrack.volume().markInterested();
        effectTrack.color().markInterested();
        effectTrack.exists().markInterested();

        (function(effectIndex, effTrack) {
            // Add volume observer for bi-directional sync
            effTrack.volume().addValueObserver(function(value) {
                // Update encoder LED if this effect track is linked
                var encoderNum = Twister._effectTrackToEncoder ? Twister._effectTrackToEncoder[effectIndex] : null;
                if (encoderNum) {
                    Twister.setEncoderLED(encoderNum, Math.round(value * 127));
                }
            });

            // Cache FX track info when name changes (detects [N] pattern)
            effTrack.name().addValueObserver(function(name) {
                Bitwig._updateFxTrackCache(effectIndex, name, effTrack);
            });

            // Update encoder color when effect track color changes
            effTrack.color().addValueObserver(function(red, green, blue) {
                var encoderNum = Twister._effectTrackToEncoder ? Twister._effectTrackToEncoder[effectIndex] : null;
                if (encoderNum) {
                    Twister.setEncoderColor(encoderNum,
                        Math.round(red * 255),
                        Math.round(green * 255),
                        Math.round(blue * 255));
                }
            });
        })(e, effectTrack);
    }

    // Add tempo observer for encoder sync (bi-directional like volume/pan)
    transport.tempo().addRawValueObserver(function(bpm) {
        // Only update if tempo encoder is linked (top-level group selected)
        if (Controller.selectedGroup === 16) {
            var ledValue = Math.round((bpm - Twister.TEMPO_MIN) / (Twister.TEMPO_MAX - Twister.TEMPO_MIN) * 127);
            ledValue = Math.max(0, Math.min(127, ledValue));
            Twister.setEncoderLED(Twister.TEMPO_ENCODER, ledValue);
        }
    });

    // Add playPosition observer for ProjectExplorer playhead indicator
    transport.playPosition().addValueObserver(function(beats) {
        ProjectExplorer.updatePlayheadIndicator(beats);
    });

    // Add loop range observers for bi-directional time selection display
    transport.arrangerLoopStart().markInterested();
    transport.arrangerLoopStart().addValueObserver(function(beats) {
        ProjectExplorer._loopStartBeat = beats;
        ProjectExplorer.refreshLoopHighlight();
    });

    transport.arrangerLoopDuration().markInterested();
    transport.arrangerLoopDuration().addValueObserver(function(duration) {
        ProjectExplorer._loopDuration = duration;
        ProjectExplorer.refreshLoopHighlight();
    });

    // Enter Programmer Mode on Launchpad MK2
    Launchpad.enterProgrammerMode();

    // Set up marker observers
    var markerBank = Bitwig.getMarkerBank();
    if (markerBank) {
        for (var i = 0; i < 32; i++) {
            var marker = markerBank.getItemAt(i);

            // Mark properties as interested
            marker.exists().markInterested();
            marker.getColor().markInterested();
            marker.position().markInterested();  // Needed for prepareRecordingAtMarker

            // Observe exists changes to refresh lane
            (function(markerIndex) {
                marker.exists().addValueObserver(function(exists) {
                    if (debug) println("Marker " + markerIndex + " exists: " + exists);
                    // Re-register and refresh both marker views
                    LaunchpadLane.registerBirdEyeBehaviors();  // Regions may have changed
                    LaunchpadLane.refreshBirdEye();            // Page 1: bird's eye regions
                    ProjectExplorer.refresh();                 // Page 2: project explorer
                });

                // Observe color changes to refresh lane
                marker.getColor().addValueObserver(function(red, green, blue) {
                    if (debug) println("Marker " + markerIndex + " color changed");
                    // Re-register and refresh both marker views
                    LaunchpadLane.registerBirdEyeBehaviors();  // Regions may have changed
                    LaunchpadLane.refreshBirdEye();            // Page 1: bird's eye regions
                    ProjectExplorer.refresh();                 // Page 2: project explorer
                });
            })(i);
        }
    }

    // Initialize LaunchpadQuadrant
    LaunchpadQuadrant.bottomRight.init();
    LaunchpadQuadrant.bottomLeft.init();

    // Initialize marker lane
    LaunchpadLane.init();

    // Initialize control buttons
    LaunchpadTopButtons.init();

    // Initialize clip launcher
    ClipLauncher.init();

    // Initialize Roland Piano transpose
    RolandPiano.init();

    // Initialize nanoKEY2 on port 3
    NanoKey2.init();
    if (debug) println("nanoKEY2 initialized on port 3 - expecting nanoKEY2 to be configured as input port 3");

    // Set up MIDI callback for nanoKEY2
    host.getMidiInPort(3).setMidiCallback(function(status, data1, data2) {
        // Log MIDI from port 3 when debug is enabled
        if (debug) {
            println("nanoKEY2 MIDI: " + status + ", " + data1 + ", " + data2 + " [" +
                    status.toString(16) + " " + data1.toString(16) + " " + data2.toString(16) + "]");
        }

        // Handle note on messages (status 0x90) with velocity > 0
        if (status === 0x90 && data2 > 0) {
            if (debug) println("  -> Note ON detected, calling handleKeySelection(" + data1 + ")");
            NanoKey2.handleKeySelection(data1);
        }
    });

    // Register pages (order: page 1, page 2, page 3)
    Pages.registerPage(Page_MainControl);     // Page 1: Main control + markers
    Pages.registerPage(Page_MarkerManager);   // Page 2: Detailed marker manager
    Pages.registerPage(Page_ClipLauncher);    // Page 3: Clip launcher

    // Initialize pagination system (after pages registered)
    Pages.init();

    // Initialize Pager (reactive page state manager)
    Pager.init();

    // Initialize mode switcher
    LaunchpadModeSwitcher.init();

    // Initialize controller logic
    Controller.init();

    // Build and print track tree for debugging (delayed to allow track bank to populate)
    host.scheduleTask(function() {
        if (debug) println("=== Calculating track depths ===");
        calculateTrackDepths();
        if (debug) println("=== Building track tree ===");
        var tree = Bitwig.getTrackTree();
        printTrackTree(tree);

        // Refresh group display now that track depths are calculated
        Controller.refreshGroupDisplay();

        // Refresh marker lane
        LaunchpadLane.refresh();
    }, null, 100);  // Wait 100ms for track bank to populate
}

function onSysex(data) {
    printSysex(data);
}

function flush() {
}

function exit() {
    Controller.exit();
}
