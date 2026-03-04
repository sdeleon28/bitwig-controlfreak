loadAPI(24);

host.defineController("Generic", "Launchpad + Twister", "1.0", "3ffac818-54ac-45e0-928a-d01628afceac", "xan_t");
host.defineMidiPorts(4, 2);  // 4 inputs (Launchpad, Twister, Roland Piano, nanoKEY2), 2 outputs

// Debug flag - set to true to enable verbose logging
var debug = false;

// Load external modules
// Layer 1: Foundation
load('Bitwig.js');
load('BitwigActions.js');
load('DeviceMappings.js');
load('Pages.js');

// Layer 2: Hardware abstraction
load('Launchpad.js');
load('Twister.js');
load('RolandPiano.js');
load('NanoKey2.js');

// Layer 3: Isolation
load('Pager.js');
load('Animations.js');

// Layer 3.5: Mapper infrastructure
load('TwisterPainter.js');
load('FrequalizerDevice.js');
load('FrequalizerTwisterMapper.js');
load('FrequalizerPadMapper.js');

// Layer 3.5: Device mapping behavior
load('DeviceMapper.js');
load('DeviceQuadrant.js');
load('DeviceSelector.js');

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
load('Page_DebugActions.js');
load('Page_ColorPalette.js');

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

    // Create main track bank to access all tracks (flat list including nested tracks)
    // 64 tracks, 8 sends (for FX routing), 0 scenes
    trackBank = host.createMainTrackBank(64, 8, 0);

    // Create effect track bank to access FX/return tracks
    // 8 effect tracks, 0 scenes
    var effectTrackBank = host.createEffectTrackBank(8, 0);

    // Initialize Bitwig with track bank and transport
    Bitwig = new BitwigHW({
        host: host,
        bitwigActions: BitwigActions,
        debug: debug,
        println: println
    });
    Bitwig.init(trackBank, transport, effectTrackBank);

    // Launchpad on port 0
    launchpadOut = host.getMidiOutPort(0);
    launchpadOut.setShouldSendMidiBeatClock(true);  // Sync flashing/pulsing to project BPM
    Launchpad = new LaunchpadHW({
        midiOutput: launchpadOut,
        bitwig: Bitwig,
        host: host,
        debug: debug,
        println: println
    });

    noteIn = host.getMidiInPort(0).createNoteInput("Launchpad", "??????");
    noteIn.setShouldConsumeEvents(false);

    host.getMidiInPort(0).setMidiCallback(function(status, data1, data2) {
        printMidi(status, data1, data2);
        Controller.onLaunchpadMidi(status, data1, data2);
    });
    host.getMidiInPort(0).setSysexCallback(onSysex);

    // MIDI Fighter Twister on port 1
    twisterOut = host.getMidiOutPort(1);
    Twister = new TwisterHW({
        midiOutput: twisterOut,
        bitwig: Bitwig,
        launchpadModeSwitcher: LaunchpadModeSwitcher,
        host: host,
        debug: debug,
        println: println
    });

    host.getMidiInPort(1).setMidiCallback(function(status, data1, data2) {
        Controller.onTwisterMidi(status, data1, data2);
    });

    // Create TwisterPainter for mapper-based device control
    var twisterPainter = new TwisterPainter({ midiOutput: twisterOut });

    // Create cursor track that follows selection (for select mode + remote controls)
    var cursorTrack = host.createCursorTrack("cursor", "Cursor", 0, 0, true);
    var cursorDevice = cursorTrack.createCursorDevice();
    var remoteControls = cursorDevice.createCursorRemoteControlsPage(8);

    // Mark remote control parameters as interested and add observers
    for (var rc = 0; rc < 8; rc++) {
        var param = remoteControls.getParameter(rc);
        param.markInterested();
        param.value().markInterested();
        param.name().markInterested();
        param.discreteValueCount().markInterested();
        // Add observer for bi-directional sync with Twister
        (function(paramIndex) {
            param.value().addValueObserver(function(value) {
                Twister.updateRemoteControlLED(paramIndex, value);
            });
        })(rc);
    }

    // Add remote control name observers for reactive linking
    for (var rc = 0; rc < 8; rc++) {
        (function(paramIndex) {
            remoteControls.getParameter(paramIndex).name().addValueObserver(function(name) {
                Controller.onRemoteControlNameChanged(paramIndex, name);
            });
        })(rc);
    }

    Bitwig.initCursor(cursorTrack, cursorDevice, remoteControls);

    // Track-level remote controls (separate from device RCs)
    var trackRemoteControls = cursorTrack.createCursorRemoteControlsPage("track-rc", 8, "");
    for (var trc = 0; trc < 8; trc++) {
        var trcParam = trackRemoteControls.getParameter(trc);
        trcParam.markInterested();
        trcParam.value().markInterested();
        trcParam.name().markInterested();
        trcParam.discreteValueCount().markInterested();
        (function(paramIndex) {
            trcParam.value().addValueObserver(function(value) {
                Twister.updateTrackRemoteControlLED(paramIndex, value);
            });
        })(trc);
    }
    Bitwig.initTrackRemoteControls(trackRemoteControls);

    // Device bank for device selector (13 device slots)
    var deviceBank = cursorTrack.createDeviceBank(13);
    for (var db = 0; db < 13; db++) {
        var bankDevice = deviceBank.getItemAt(db);
        bankDevice.exists().markInterested();
        bankDevice.name().markInterested();
        bankDevice.isEnabled().markInterested();
        (function(deviceIndex) {
            bankDevice.exists().addValueObserver(function(exists) {
                DeviceSelector.onDeviceExistsChanged(deviceIndex, exists);
            });
            bankDevice.name().addValueObserver(function(name) {
                DeviceSelector.onDeviceNameChanged(deviceIndex, name);
            });
        })(db);
    }
    Bitwig.initDeviceBank(deviceBank);

    // Cursor device position observer (for highlighting in device selector)
    cursorDevice.position().markInterested();
    cursorDevice.isWindowOpen().markInterested();
    cursorDevice.isPlugin().markInterested();
    cursorDevice.position().addValueObserver(function(position) {
        DeviceSelector.onCursorDevicePositionChanged(position);
    });

    // Cursor track name observer (for detecting track selection changes)
    cursorTrack.name().markInterested();
    cursorTrack.name().addValueObserver(function(name) {
        Controller.onCursorTrackChanged(name);
    });

    // Register direct parameter observers (for devices without Remote Controls pages)
    cursorDevice.addDirectParameterIdObserver(function(ids) {
        Bitwig.setDirectParamIds(ids);
        DeviceMapper.onDirectParamsChanged();
    });

    cursorDevice.addDirectParameterNameObserver(64, function(id, name) {
        Bitwig.setDirectParamName(id, name);
        DeviceQuadrant.onDirectParamNameChanged(id, name);
    });

    cursorDevice.addDirectParameterNormalizedValueObserver(function(id, value) {
        DeviceMapper.onParamValueChanged(id, value);
        DeviceQuadrant.onParamValueChanged(id, value);
        Controller.onDeviceParamChanged(id, value);
    });

    // Observe cursor device name changes (for auto-remapping encoders)
    cursorDevice.name().markInterested();
    cursorDevice.name().addValueObserver(function(name) {
        Controller.onDeviceChanged(name);
    });

    var masterTrack = host.createMasterTrack(0);
    Bitwig.initMasterTrack(masterTrack);

    // Project-level remote controls (from root track group)
    var project = host.getProject();
    var rootTrackGroup = project.getRootTrackGroup();
    var projectRemoteControls = rootTrackGroup.createCursorRemoteControlsPage("project-rc", 8, "");
    for (var prc = 0; prc < 8; prc++) {
        var prcParam = projectRemoteControls.getParameter(prc);
        prcParam.markInterested();
        prcParam.value().markInterested();
        prcParam.name().markInterested();
        prcParam.discreteValueCount().markInterested();
        (function(paramIndex) {
            prcParam.value().addValueObserver(function(value) {
                Twister.updateProjectRemoteControlLED(paramIndex, value);
            });
        })(prc);
    }
    Bitwig.initProjectRemoteControls(projectRemoteControls);

    // Observe cursor device enabled state (for DeviceQuadrant bypass pad)
    cursorDevice.isEnabled().markInterested();
    cursorDevice.isEnabled().addValueObserver(function(enabled) {
        DeviceQuadrant.onDeviceEnabledChanged(enabled);
    });

    // Observe cursor track solo state (for DeviceQuadrant and DeviceSelector solo pads)
    cursorTrack.solo().markInterested();
    cursorTrack.solo().addValueObserver(function(soloed) {
        DeviceQuadrant.onCursorTrackSoloChanged(soloed);
        DeviceSelector.onCursorTrackSoloChanged(soloed);
    });
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
                var encoderNumber = Twister.getEncoderForTrack(trackId);
                if (encoderNumber && LaunchpadModeSwitcher.getEncoderMode() === 'volume') {
                    Twister.setEncoderLED(encoderNumber, value);
                }
            });

            // Add pan observer that checks for encoder links
            trackObj.pan().markInterested();
            trackObj.pan().addValueObserver(128, function(value) {
                var encoderNumber = Twister.getEncoderForTrack(trackId);
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
                        var encoderNum = Twister.getEncoderForSend(tid, sendIndex);
                        if (encoderNum && LaunchpadModeSwitcher.getPadMode() === 'sendA') {
                            Twister.setEncoderLED(encoderNum, value);
                        }
                    });
                })(trackId, s);
            }

            // Add mute observer for track grid
            trackObj.mute().markInterested();
            trackObj.mute().addValueObserver(function(isMuted) {
                var padNumber = Launchpad.getPadForTrack(trackId);
                if (padNumber) {
                    var color = Launchpad.getTrackGridPadColor(trackId);
                    Launchpad.setPadColor(padNumber, color);
                }
            });

            // Add solo observer for track grid
            trackObj.solo().markInterested();
            trackObj.solo().addValueObserver(function(isSoloed) {
                var padNumber = Launchpad.getPadForTrack(trackId);
                if (padNumber) {
                    var color = Launchpad.getTrackGridPadColor(trackId);
                    Launchpad.setPadColor(padNumber, color);
                }
            });

            // Add record arm observer for track grid
            trackObj.arm().markInterested();
            trackObj.arm().addValueObserver(function(isArmed) {
                var padNumber = Launchpad.getPadForTrack(trackId);
                if (padNumber) {
                    var color = Launchpad.getTrackGridPadColor(trackId);
                    Launchpad.setPadColor(padNumber, color);
                }
            });

            // Add color observer that checks for encoder and pad links
            trackObj.color().addValueObserver(function(red, green, blue) {
                // Update encoder colors
                var encoderNumber = Twister.getEncoderForTrack(trackId);
                if (encoderNumber) {
                    var redMidi = Math.round(red * 255);
                    var greenMidi = Math.round(green * 255);
                    var blueMidi = Math.round(blue * 255);
                    Twister.setEncoderColor(encoderNumber, redMidi, greenMidi, blueMidi);
                }

                // Update pad colors - only for group selector pads
                // Track grid pads are handled by Controller.refreshTrackGrid (based on pad mode)
                var padNumber = Launchpad.getPadForTrack(trackId);
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
                var encoderNum = Twister.getEncoderForEffectTrack(effectIndex);
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
                var encoderNum = Twister.getEncoderForEffectTrack(effectIndex);
                if (encoderNum) {
                    Twister.setEncoderColor(encoderNum,
                        Math.round(red * 255),
                        Math.round(green * 255),
                        Math.round(blue * 255));
                }
            });
        })(e, effectTrack);
    }

    // Add playPosition observer for playhead indicators
    transport.playPosition().addValueObserver(function(beats) {
        ProjectExplorer.updatePlayheadIndicator(beats);
        LaunchpadLane.updatePlayheadIndicator(beats);
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
                    LaunchpadLane.registerMarkerBehaviors();   // Re-register marker behaviors
                    LaunchpadLane.refresh();                   // Page 1: simple markers
                    ProjectExplorer.refresh();                 // Page 2: project explorer
                });

                // Observe color changes to refresh lane
                marker.getColor().addValueObserver(function(red, green, blue) {
                    if (debug) println("Marker " + markerIndex + " color changed");
                    // Refresh marker views
                    LaunchpadLane.refresh();                   // Page 1: simple markers
                    ProjectExplorer.refresh();                 // Page 2: project explorer
                });
            })(i);
        }
    }

    // Initialize LaunchpadQuadrant
    LaunchpadQuadrant = new LaunchpadQuadrantHW({
        launchpad: Launchpad,
        debug: debug,
        println: println
    });

    // Initialize marker lane
    LaunchpadLane = new LaunchpadLaneHW({
        bitwig: Bitwig,
        bitwigActions: BitwigActions,
        launchpad: Launchpad,
        pager: Pager,
        controller: Controller,
        host: host,
        debug: debug,
        println: println
    });

    // Initialize control buttons
    LaunchpadTopButtons = new LaunchpadTopButtonsHW({
        launchpad: Launchpad,
        pager: Pager,
        pages: Pages,
        bitwig: Bitwig,
        clipGestures: ClipGestures,
        clipLauncher: ClipLauncher,
        projectExplorer: ProjectExplorer,
        bitwigActions: BitwigActions,
        debug: debug,
        println: println
    });
    LaunchpadTopButtons.init();

    // Initialize Roland Piano transpose
    RolandPiano = new RolandPianoHW({
        host: host,
        debug: debug,
        println: println
    });
    RolandPiano.init();

    // Initialize nanoKEY2 on port 3
    NanoKey2 = new NanoKey2HW({
        rolandPiano: RolandPiano,
        host: host,
        debug: debug,
        println: println
    });
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

    // Initialize Pager (reactive page state manager)
    Pager = new PagerHW({
        launchpad: Launchpad,
        debug: debug,
        println: println
    });
    Pager.init();

    // Initialize clip launcher (after Pager)
    ClipLauncher = new ClipLauncherHW({
        host: host,
        launchpad: Launchpad,
        pager: Pager,
        debug: debug,
        println: println
    });
    ClipLauncher.init();

    // Initialize clip gestures (after ClipLauncher)
    ClipGestures = new ClipGestures({ launchpad: Launchpad, clipLauncher: ClipLauncher });
    ClipGestures
        .click(function(t, s, slot) {
            if (slot.isRecording().get() || slot.isRecordingQueued().get()) {
                this._trackBank.getItemAt(t).stop();
                return;
            }
            if (slot.hasContent().get()) {
                this.launchClip(t, s);
            } else {
                this.recordClip(t, s);
            }
        })
        .hold(function(t, s, slot) {
            this.deleteClip(t, s);
        })
        .modifier(Launchpad.buttons.top6, {
            name: 'duplicate',
            color: Launchpad.colors.green,
            click: function(t, s, slot) {
                this.handleDuplicateClick(t, s);
            },
            onRelease: function() {
                this.clearDuplicateSource();
            }
        });

    // Fix circular dep: ClipLauncher needs ClipGestures for pad behavior callbacks
    ClipLauncher.clipGestures = ClipGestures;

    // Initialize ProjectExplorer (after Pager, before Pages)
    ProjectExplorer = new ProjectExplorerHW({
        bitwig: Bitwig,
        launchpad: Launchpad,
        pager: Pager,
        host: host,
        debug: debug,
        println: println
    });

    // Initialize Pages (after Pager + ProjectExplorer, before registerPage calls)
    Pages = new PagesHW({
        pager: Pager,
        launchpad: Launchpad,
        projectExplorer: ProjectExplorer,
        debug: debug,
        println: println
    });

    // Fix stale refs: LaunchpadLane and LaunchpadTopButtons were constructed before Pager/Pages/ProjectExplorer/ClipLauncher/ClipGestures
    LaunchpadLane.pager = Pager;
    LaunchpadTopButtons.pager = Pager;
    LaunchpadTopButtons.pages = Pages;
    LaunchpadTopButtons.projectExplorer = ProjectExplorer;
    LaunchpadTopButtons.clipLauncher = ClipLauncher;
    LaunchpadTopButtons.clipGestures = ClipGestures;

    // Initialize Page_MainControl (before LaunchpadModeSwitcher which depends on it)
    // NOTE: mainControl assigned to LaunchpadTopButtons after creation below
    Page_MainControl = new PageMainControlHW({
        launchpadLane: LaunchpadLane,
        launchpad: Launchpad,
        launchpadQuadrant: LaunchpadQuadrant,
        debug: debug,
        println: println
    });
    Pages.registerPage(Page_MainControl);     // Page 1: Main control + markers
    LaunchpadTopButtons.mainControl = Page_MainControl;

    // Set circular deps on Launchpad now that Pager exists
    Launchpad.pager = Pager;

    // Initialize mode switcher (before Pages.init, which triggers Page_MainControl.show → refreshTrackGrid)
    LaunchpadModeSwitcher = new LaunchpadModeSwitcherHW({
        launchpad: Launchpad,
        pager: Pager,
        twister: Twister,
        controller: Controller,
        pageMainControl: Page_MainControl,
        host: host,
        debug: debug,
        println: println
    });

    // Set LaunchpadModeSwitcher dep on Launchpad now that it's initialized
    Launchpad.launchpadModeSwitcher = LaunchpadModeSwitcher;

    // Fix stale ref: Twister was constructed before LaunchpadModeSwitcher existed
    Twister.launchpadModeSwitcher = LaunchpadModeSwitcher;

    // Initialize clip launcher page (after LaunchpadModeSwitcher is created)
    Page_ClipLauncher = new PageClipLauncherHW({
        clipLauncher: ClipLauncher,
        pager: Pager,
        launchpadModeSwitcher: LaunchpadModeSwitcher,
        launchpad: Launchpad,
        debug: debug,
        println: println
    });
    Pages.registerPage(Page_ClipLauncher);    // Page 3: Clip launcher

    // Initialize remaining pages
    Page_MarkerManager = new PageMarkerManagerHW({
        pager: Pager,
        launchpad: Launchpad,
        projectExplorer: ProjectExplorer,
        bitwig: Bitwig,
        bitwigActions: BitwigActions,
        host: host,
        debug: debug,
        println: println
    });
    Pages.registerPage(Page_MarkerManager);   // Page 2: Detailed marker manager

    Page_DebugActions = new PageDebugActionsHW({
        pager: Pager,
        bitwig: Bitwig,
        bitwigActions: BitwigActions,
        host: host,
        debug: debug,
        println: println
    });
    Pages.registerPage(Page_DebugActions);    // Page 4: Debug actions for testing

    Page_ColorPalette = new PageColorPaletteHW({
        id: "color-palette-1",
        pageNumber: 5,
        colorOffset: 0,
        pager: Pager,
        host: host,
        debug: debug,
        println: println
    });
    Pages.registerPage(Page_ColorPalette);    // Page 5: Color palette (colors 0-63)

    Page_ColorPalette2 = new PageColorPaletteHW({
        id: "color-palette-2",
        pageNumber: 6,
        colorOffset: 64,
        pager: Pager,
        host: host,
        debug: debug,
        println: println
    });
    Pages.registerPage(Page_ColorPalette2);   // Page 6: Color palette (colors 64-127)

    // Initialize DeviceMapper (before Controller)
    DeviceMapper = new DeviceMapperHW({
        twister: Twister,
        bitwig: Bitwig,
        host: host,
        deviceMappings: DeviceMappings,
        debug: debug,
        println: println
    });

    // Initialize DeviceQuadrant (after Pager, LaunchpadQuadrant, Bitwig, Page_MainControl)
    DeviceQuadrant = new DeviceQuadrantHW({
        launchpad: Launchpad,
        launchpadQuadrant: LaunchpadQuadrant,
        pager: Pager,
        bitwig: Bitwig,
        pageNumber: Page_MainControl.pageNumber,
        debug: debug,
        println: println
    });

    // Initialize DeviceSelector (after Pager, LaunchpadQuadrant, Bitwig, Page_MainControl)
    DeviceSelector = new DeviceSelectorHW({
        launchpad: Launchpad,
        launchpadQuadrant: LaunchpadQuadrant,
        pager: Pager,
        bitwig: Bitwig,
        pageNumber: Page_MainControl.pageNumber,
        debug: debug,
        println: println
    });

    // Build mapper registry (mapper factory functions for polymorphic device control)
    var mappers = {};
    mappers['Frequalizer'] = function(deps) {
        var device = new FrequalizerDevice({ println: deps.println });
        return new FrequalizerTwisterMapper({ device: device, painter: deps.painter, println: deps.println });
    };
    mappers['Frequalizer Alt'] = mappers['Frequalizer'];

    // Build pad mapper registry (pad mapper factory functions for Launchpad pad control)
    var padMappers = {};
    padMappers['Frequalizer'] = function() {
        return new FrequalizerPadMapper();
    };
    padMappers['Frequalizer Alt'] = padMappers['Frequalizer'];

    // Initialize Controller (after all deps are ready)
    Controller = new ControllerHW({
        twister: Twister,
        bitwig: Bitwig,
        pager: Pager,
        launchpad: Launchpad,
        launchpadQuadrant: LaunchpadQuadrant,
        launchpadModeSwitcher: LaunchpadModeSwitcher,
        launchpadTopButtons: LaunchpadTopButtons,
        pages: Pages,
        pageMainControl: Page_MainControl,
        deviceMapper: DeviceMapper,
        deviceQuadrant: DeviceQuadrant,
        deviceSelector: DeviceSelector,
        mappers: mappers,
        padMappers: padMappers,
        painter: twisterPainter,
        host: host,
        debug: debug,
        println: println
    });

    // Fix stale ref: LaunchpadModeSwitcher was constructed before Controller existed
    LaunchpadModeSwitcher.controller = Controller;

    // Fix stale ref: LaunchpadLane was constructed before Controller existed
    LaunchpadLane.controller = Controller;

    // Fix stale ref: Page_MainControl was constructed before Controller/LaunchpadModeSwitcher existed
    Page_MainControl.controller = Controller;
    Page_MainControl.launchpadModeSwitcher = LaunchpadModeSwitcher;

    // Initialize pagination system (after pages registered, after mode switcher ready)
    Pages.init();

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
