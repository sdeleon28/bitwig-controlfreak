/**
 * Controller business logic
 * @namespace
 */
var Controller = {
    /**
     * Currently selected group (1-16, where 16 = top-level)
     * @private
     */
    selectedGroup: null,

    /**
     * Initialize controller
     */
    init: function() {
        // Auto-select group 16 (top-level tracks)
        this.selectGroup(16);
        if (debug) println("Controller initialized");
    },

    /**
     * Select a group and link encoders to its children
     * @param {number} groupNumber - Group number (1-16, where 16 = top-level)
     */
    selectGroup: function(groupNumber) {
        // Validate group number
        if (groupNumber < 1 || groupNumber > 16) {
            return;
        }

        // Clear all encoder links
        Twister.unlinkAll();

        if (groupNumber === 16) {
            // Top-level: link encoders 1-15 to depth-0 tracks
            // Encoder 16 remains unlinked
            host.showPopupNotification("Top Level");
            var topTracks = Bitwig.getTopLevelTracks();

            for (var i = 0; i < topTracks.length; i++) {
                var trackId = topTracks[i];
                var track = Bitwig.getTrack(trackId);

                if (track) {
                    var name = track.name().get();

                    // Parse for (x) notation (only 1-15, skip tempo encoder)
                    var match = name.match(/\((\d+)\)/);
                    if (match) {
                        var encoderNum = parseInt(match[1]);
                        if (encoderNum >= 1 && encoderNum <= 15 && encoderNum !== Twister.TEMPO_ENCODER) {
                            Twister.linkEncoderToTrack(encoderNum, trackId);
                        }
                    }
                }
            }

            // Link tempo encoder
            Twister.linkEncoderToBehavior(Twister.TEMPO_ENCODER,
                function(value) {
                    var tempo = Bitwig.getTransport().tempo();
                    // Map 0-127 to TEMPO_MIN-TEMPO_MAX BPM, rounded to integer
                    var bpm = Math.round(Twister.TEMPO_MIN + (value / 127.0) * (Twister.TEMPO_MAX - Twister.TEMPO_MIN));
                    tempo.setRaw(bpm);
                },
                null,  // no press behavior
                { r: 255, g: 255, b: 255 }  // white color for tempo
            );

            // Initial LED sync to current tempo
            var tempo = Bitwig.getTransport().tempo();
            var currentBpm = tempo.getRaw();
            var ledValue = Math.round((currentBpm - Twister.TEMPO_MIN) / (Twister.TEMPO_MAX - Twister.TEMPO_MIN) * 127);
            ledValue = Math.max(0, Math.min(127, ledValue));
            Twister.setEncoderLED(Twister.TEMPO_ENCODER, ledValue);
        } else {
            // Find group by number (any depth)
            var groupTrackId = Bitwig.findGroupByNumber(groupNumber);

            if (groupTrackId !== null) {
                // Show group name notification
                var groupTrack = Bitwig.getTrack(groupTrackId);
                if (groupTrack) {
                    host.showPopupNotification(groupTrack.name().get());
                }

                // Get children of this group
                var children = Bitwig.getGroupChildren(groupTrackId);

                // Link encoders 1-15 to children with (1)-(15) notation
                for (var i = 0; i < children.length; i++) {
                    var trackId = children[i];
                    var track = Bitwig.getTrack(trackId);

                    if (track) {
                        var name = track.name().get();

                        // Parse for (x) notation (only 1-15)
                        var match = name.match(/\((\d+)\)/);
                        if (match) {
                            var encoderNum = parseInt(match[1]);
                            if (encoderNum >= 1 && encoderNum <= 15) {
                                Twister.linkEncoderToTrack(encoderNum, trackId);
                            }
                        }
                    }
                }

                // Link encoder 16 to the group track itself
                Twister.linkEncoderToTrack(16, groupTrackId);
            }
        }

        // Update selected group
        this.selectedGroup = groupNumber;

        // Refresh group display
        this.refreshGroupDisplay();

        // Refresh track grid
        this.refreshTrackGrid();
    },

    /**
     * Refresh the group selector display on Launchpad
     */
    refreshGroupDisplay: function() {
        var page = Pager.getActivePage();

        // Unlink all pads first
        Launchpad.unlinkAllPads();

        // Link all available groups to their pads (groups 1-15)
        for (var i = 1; i <= 15; i++) {
            var groupTrackId = Bitwig.findGroupByNumber(i);
            if (groupTrackId !== null) {
                var padNote = LaunchpadQuadrant.bottomRight.pads[i - 1];
                Launchpad.linkPadToTrack(padNote, groupTrackId, page);
            }
        }

        // Handle pad 16 (top-level group) - use white color
        var pad16 = LaunchpadQuadrant.bottomRight.pads[15];  // Index 15 = pad 16
        if (this.selectedGroup === 16) {
            Pager.requestPaint(page, pad16, Launchpad.getBrightnessVariant(Launchpad.colors.white, Launchpad.brightness.bright));
        } else {
            Pager.requestPaint(page, pad16, Launchpad.getBrightnessVariant(Launchpad.colors.white, Launchpad.brightness.dim));
        }

        // Highlight selected group with bright color variant (groups 1-15)
        if (this.selectedGroup && this.selectedGroup <= 15) {
            var selectedPad = LaunchpadQuadrant.bottomRight.pads[this.selectedGroup - 1];
            var groupTrackId = Bitwig.findGroupByNumber(this.selectedGroup);

            if (groupTrackId !== null) {
                var track = Bitwig.getTrack(groupTrackId);
                if (track) {
                    var color = track.color();
                    var launchpadColor = Launchpad.bitwigColorToLaunchpad(
                        color.red(),
                        color.green(),
                        color.blue()
                    );
                    var brightColor = Launchpad.getBrightnessVariant(launchpadColor, Launchpad.brightness.bright);
                    Pager.requestPaint(page, selectedPad, brightColor);
                }
            }
        }
    },

    /**
     * Refresh the track grid display on Launchpad
     */
    refreshTrackGrid: function() {
        var self = this;
        var page = Pager.getActivePage();

        // Unlink all track grid pads
        for (var i = 0; i < LaunchpadQuadrant.bottomLeft.pads.length; i++) {
            Launchpad.unlinkPad(LaunchpadQuadrant.bottomLeft.pads[i]);
        }

        // Link pads based on encoder links
        var padMode = LaunchpadModeSwitcher.getPadMode();

        for (var encoderNum = 1; encoderNum <= 16; encoderNum++) {
            var link = Twister.getEncoderLink(encoderNum);
            if (link) {
                var padNote = LaunchpadQuadrant.bottomLeft.pads[encoderNum - 1];
                var trackId = link.trackId;

                Launchpad.linkPadToTrack(padNote, trackId, page);

                // Register click behaviors based on current pad mode
                if (padMode === 'mute') {
                    (function(tid, pn) {
                        Launchpad.registerPadBehavior(pn, function() {
                            var track = Bitwig.getTrack(tid);
                            if (track) {
                                host.showPopupNotification(track.name().get());
                                track.mute().toggle();
                            }
                        }, null, Page_MainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'solo') {
                    (function(tid, pn) {
                        Launchpad.registerPadBehavior(pn, function() {
                            var track = Bitwig.getTrack(tid);
                            if (track) {
                                host.showPopupNotification(track.name().get());
                                track.solo().toggle();
                            }
                        }, null, Page_MainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'recordArm') {
                    (function(tid, pn) {
                        Launchpad.registerPadBehavior(pn, function() {
                            var track = Bitwig.getTrack(tid);
                            if (track) {
                                host.showPopupNotification(track.name().get());
                                // XOR arm: disarm all other tracks first
                                for (var t = 0; t < 64; t++) {
                                    var otherTrack = Bitwig.getTrack(t);
                                    if (otherTrack && t !== tid) {
                                        otherTrack.arm().set(false);
                                    }
                                }
                                track.arm().set(true);
                            }
                        }, null, Page_MainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'sendA') {
                    (function(tid, pn) {
                        Launchpad.registerPadBehavior(pn, function() {
                            var track = Bitwig.getTrack(tid);
                            if (track) {
                                host.showPopupNotification(track.name().get() + " → Sends");
                                Twister.linkEncodersToTrackSends(tid);
                            }
                        }, null, Page_MainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'select') {
                    (function(tid, pn) {
                        Launchpad.registerPadBehavior(pn, function() {
                            var track = Bitwig.getTrack(tid);
                            if (track) {
                                // Select track (XOR - deselects others)
                                Bitwig.selectTrack(tid);
                                // Link Twister encoders to remote controls
                                Twister.linkEncodersToRemoteControls();
                                host.showPopupNotification(track.name().get() + " → Remote Controls");
                            }
                        }, null, Page_MainControl.pageNumber);
                    })(trackId, padNote);
                }
            }
        }
    },

    /**
     * Handle track name changes for automatic re-linking
     * @param {number} trackId - Track ID (0-63)
     * @param {string} newName - New track name
     */
    handleTrackNameChange: function(trackId, newName) {
        // Only handle tracks within the currently selected group
        if (!this.selectedGroup) {
            return;
        }

        // Check if this track is in the selected group
        var isInGroup = false;

        if (this.selectedGroup === 16) {
            // Check if track is top-level
            isInGroup = Bitwig._trackDepths[trackId] === 0;
        } else {
            // Check if track is a child of the selected group
            var groupTrackId = Bitwig.findGroupByNumber(this.selectedGroup);
            if (groupTrackId !== null) {
                var children = Bitwig.getGroupChildren(groupTrackId);
                isInGroup = children.indexOf(trackId) !== -1;
            }
        }

        if (!isInGroup) {
            return; // Track not in selected group
        }

        // Parse the new name for encoder numbers
        var encoderMatch = newName.match(/\((\d+)\)/);

        // Find if this track was previously linked to any encoder
        var previousEncoder = Twister.getEncoderForTrack(trackId);

        if (encoderMatch) {
            var newEncoder = parseInt(encoderMatch[1]);

            if (newEncoder >= 1 && newEncoder <= 16) {
                // Check if another track is using this encoder
                var existingLink = Twister.getEncoderLink(newEncoder);
                if (existingLink && existingLink.trackId !== trackId) {
                    // Another track has this encoder - unlink it
                    Twister.unlinkEncoder(newEncoder);
                }

                // Unlink from previous encoder if different
                if (previousEncoder && previousEncoder !== newEncoder) {
                    Twister.unlinkEncoder(previousEncoder);
                }

                // Link to new encoder
                Twister.linkEncoderToTrack(newEncoder, trackId);
            } else if (previousEncoder) {
                // Invalid encoder number - unlink if previously linked
                Twister.unlinkEncoder(previousEncoder);
            }
        } else {
            // No encoder number in name - unlink if previously linked
            if (previousEncoder) {
                Twister.unlinkEncoder(previousEncoder);
            }
        }
    },

    /**
     * Sync encoder to its mapped track (using naming convention)
     * @param {number} encoderNumber - Encoder number (1-16)
     */
    syncEncoderToTrack: function(encoderNumber) {
        // Find track with "(n)" in name where n = encoderNumber
        var searchString = "(" + encoderNumber + ")";

        // Search through all tracks
        for (var i = 0; i < 64; i++) {
            var track = Bitwig.getTrack(i);
            if (track && track.name().get().indexOf(searchString) !== -1) {
                // Link this encoder to the track
                Twister.linkEncoderToTrack(encoderNumber, i);
                return;
            }
        }

        // No track found - unlink the encoder
        Twister.unlinkEncoder(encoderNumber);
    },

    /**
     * Sync all encoders to their mapped tracks
     */
    syncAllEncoders: function() {
        if (debug) println("Syncing all encoder LEDs...");
        for (var i = 1; i <= 16; i++) {
            this.syncEncoderToTrack(i);
        }
    },

    /**
     * Clear all muted tracks with flash animation
     */
    clearAllMute: function() {
        var modeConfig = LaunchpadModeSwitcher.modes.mute;

        // Flash mode button white
        Launchpad.setPadColor(modeConfig.note, Launchpad.colors.white);

        // Clear mute on all tracks
        for (var i = 0; i < 64; i++) {
            var track = Bitwig.getTrack(i);
            if (track && track.mute().get()) {
                track.mute().set(false);
            }
        }

        // Restore mode button color after delay
        host.scheduleTask(function() {
            LaunchpadModeSwitcher.refresh();
        }, null, 100);
    },

    /**
     * Clear all soloed tracks with flash animation
     */
    clearAllSolo: function() {
        var modeConfig = LaunchpadModeSwitcher.modes.solo;

        // Flash mode button white
        Launchpad.setPadColor(modeConfig.note, Launchpad.colors.white);

        // Clear solo on all tracks
        for (var i = 0; i < 64; i++) {
            var track = Bitwig.getTrack(i);
            if (track && track.solo().get()) {
                track.solo().set(false);
            }
        }

        // Restore mode button color after delay
        host.scheduleTask(function() {
            LaunchpadModeSwitcher.refresh();
        }, null, 100);
    },

    /**
     * Prepare for recording across an entire color region (bird's eye view)
     * @param {number} startMarkerIndex - First marker of region
     * @param {number} endMarkerIndex - Last marker of region
     */
    prepareRecordingAtRegion: function(startMarkerIndex, endMarkerIndex) {
        var markerBank = Bitwig.getMarkerBank();
        if (!markerBank) return;

        var startMarker = markerBank.getItemAt(startMarkerIndex);
        if (!startMarker || !startMarker.exists().get()) return;

        // Get start position from first marker of region
        var startPos = startMarker.position().get();

        // Find end position: next marker AFTER the region, or default to 4 bars after end marker
        var endPos = null;
        for (var i = endMarkerIndex + 1; i < 32; i++) {
            var nextMarker = markerBank.getItemAt(i);
            if (nextMarker && nextMarker.exists().get()) {
                endPos = nextMarker.position().get();
                break;
            }
        }

        // If no marker after region, use end marker position + 4 bars
        if (endPos === null) {
            var endMarker = markerBank.getItemAt(endMarkerIndex);
            if (endMarker && endMarker.exists().get()) {
                endPos = endMarker.position().get() + 16.0;  // 4 bars (16 beats)
            } else {
                endPos = startPos + 16.0;
            }
        }

        if (debug) {
            println("Preparing recording for region: markers " + startMarkerIndex + "-" + endMarkerIndex);
            println("  Start: " + startPos + " beats");
            println("  End: " + endPos + " beats");
        }

        // Set time selection (loop range)
        Bitwig.setTimeSelection(startPos, endPos);

        // Move playhead to start
        Bitwig.setPlayheadPosition(startPos);

        if (debug) println("Recording prepared for region");
    },

    /**
     * Clear all armed tracks with flash animation
     */
    clearAllArm: function() {
        var modeConfig = LaunchpadModeSwitcher.modes.recordArm;

        // Flash mode button white
        Launchpad.setPadColor(modeConfig.note, Launchpad.colors.white);

        // Clear record arm on all tracks
        for (var i = 0; i < 64; i++) {
            var track = Bitwig.getTrack(i);
            if (track && track.arm().get()) {
                track.arm().set(false);
            }
        }

        // Restore mode button color after delay
        host.scheduleTask(function() {
            LaunchpadModeSwitcher.refresh();
        }, null, 100);
    },

    /**
     * Handle Launchpad MIDI input
     * @param {number} status - MIDI status byte
     * @param {number} data1 - MIDI data1 byte
     * @param {number} data2 - MIDI data2 byte
     */
    onLaunchpadMidi: function(status, data1, data2) {
        // Handle CC messages (top buttons) - work on all pages
        if (status === 0xB0) {
            if (LaunchpadTopButtons.handleTopButtonCC(data1, data2)) {
                return;
            }
        }

        // Delegate pad press to current page
        if (status === 0x90 && data2 > 0) {
            if (Pages.handlePadPress(data1)) {
                return;
            }
        }

        // Delegate pad release to current page
        if ((status === 0x90 && data2 === 0) || status === 0x80) {
            Pages.handlePadRelease(data1);
        }
    },

    /**
     * Handle Twister MIDI input
     * @param {number} status - MIDI status byte
     * @param {number} data1 - MIDI data1 byte (CC number)
     * @param {number} data2 - MIDI data2 byte (value)
     */
    onTwisterMidi: function(status, data1, data2) {
        // Convert CC number to encoder number (1-16)
        var encoderNumber = Twister.ccToEncoder(data1);

        // Handle encoder turn (CC on channel 0, status 0xB0)
        if (status === 0xB0) {
            Twister.handleEncoderTurn(encoderNumber, data2);
        }

        // Handle button press (CC on channel 1, status 0xB1)
        if (status === 0xB1) {
            var pressed = data2 > 0;
            Twister.handleEncoderPress(encoderNumber, pressed);
        }
    },

    /**
     * Clean up on exit
     */
    exit: function() {
        // Clear hardware
        Twister.clearAll();
        Launchpad.clearAll();
        Launchpad.exitProgrammerMode();
    }
};
