/**
 * Controller business logic
 */
class ControllerHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.twister - Twister instance
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.pager - Pager namespace
     * @param {Object} deps.launchpad - Launchpad instance
     * @param {Object} deps.launchpadQuadrant - LaunchpadQuadrant instance
     * @param {Object} deps.launchpadModeSwitcher - LaunchpadModeSwitcher instance
     * @param {Object} deps.launchpadTopButtons - LaunchpadTopButtons instance
     * @param {Object} deps.pages - Pages namespace
     * @param {Object} deps.pageMainControl - Page_MainControl namespace
     * @param {Object} deps.host - Bitwig host
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.twister = deps.twister || null;
        this.bitwig = deps.bitwig || null;
        this.pager = deps.pager || null;
        this.launchpad = deps.launchpad || null;
        this.launchpadQuadrant = deps.launchpadQuadrant || null;
        this.launchpadModeSwitcher = deps.launchpadModeSwitcher || null;
        this.launchpadTopButtons = deps.launchpadTopButtons || null;
        this.pages = deps.pages || null;
        this.pageMainControl = deps.pageMainControl || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.selectedGroup = null;
        this.deviceMode = false;
    }

    /**
     * Initialize controller
     */
    init() {
        this.selectGroup(16);
        if (this.debug) this.println("Controller initialized");
    }

    /**
     * Select a group and link encoders to its children
     * @param {number} groupNumber - Group number (1-16, where 16 = top-level)
     */
    selectGroup(groupNumber) {
        if (groupNumber < 1 || groupNumber > 16) {
            return;
        }

        this.twister.unlinkAll();

        if (groupNumber === 16) {
            if (this.host) this.host.showPopupNotification("Top Level");
            var topTracks = this.bitwig.getTopLevelTracks();

            for (var i = 0; i < topTracks.length; i++) {
                var trackId = topTracks[i];
                var track = this.bitwig.getTrack(trackId);

                if (track) {
                    var name = track.name().get();
                    var match = name.match(/\((\d+)\)/);
                    if (match) {
                        var encoderNum = parseInt(match[1]);
                        if (encoderNum >= 1 && encoderNum <= 15 && encoderNum !== this.twister.TEMPO_ENCODER) {
                            this.twister.linkEncoderToTrack(encoderNum, trackId);
                        }
                    }
                }
            }

            // Link tempo encoder
            var self = this;
            this.twister.linkEncoderToBehavior(this.twister.TEMPO_ENCODER,
                function(value) {
                    var tempo = self.bitwig.getTransport().tempo();
                    var bpm = Math.round(self.twister.TEMPO_MIN + (value / 127.0) * (self.twister.TEMPO_MAX - self.twister.TEMPO_MIN));
                    tempo.setRaw(bpm);
                },
                null,
                { r: 255, g: 255, b: 255 }
            );

            // Initial LED sync to current tempo
            var tempo = this.bitwig.getTransport().tempo();
            var currentBpm = tempo.getRaw();
            var ledValue = Math.round((currentBpm - this.twister.TEMPO_MIN) / (this.twister.TEMPO_MAX - this.twister.TEMPO_MIN) * 127);
            ledValue = Math.max(0, Math.min(127, ledValue));
            this.twister.setEncoderLED(this.twister.TEMPO_ENCODER, ledValue);
        } else {
            var groupTrackId = this.bitwig.findGroupByNumber(groupNumber);

            if (groupTrackId !== null) {
                var groupTrack = this.bitwig.getTrack(groupTrackId);
                if (groupTrack && this.host) {
                    this.host.showPopupNotification(groupTrack.name().get());
                }

                var children = this.bitwig.getGroupChildren(groupTrackId);

                for (var i = 0; i < children.length; i++) {
                    var trackId = children[i];
                    var track = this.bitwig.getTrack(trackId);

                    if (track) {
                        var name = track.name().get();
                        var match = name.match(/\((\d+)\)/);
                        if (match) {
                            var encoderNum = parseInt(match[1]);
                            if (encoderNum >= 1 && encoderNum <= 15) {
                                this.twister.linkEncoderToTrack(encoderNum, trackId);
                            }
                        }
                    }
                }

                this.twister.linkEncoderToTrack(16, groupTrackId);
            }
        }

        this.selectedGroup = groupNumber;
        this.deviceMode = false;
        this.refreshGroupDisplay();
        this.refreshTrackGrid();
    }

    /**
     * Refresh the group selector display on Launchpad
     */
    refreshGroupDisplay() {
        var page = this.pager.getActivePage();

        this.launchpad.unlinkAllPads();

        for (var i = 1; i <= 15; i++) {
            var groupTrackId = this.bitwig.findGroupByNumber(i);
            if (groupTrackId !== null) {
                var padNote = this.launchpadQuadrant.bottomRight.pads[i - 1];
                this.launchpad.linkPadToTrack(padNote, groupTrackId, page);
            }
        }

        // Handle pad 16 (top-level group) - use white color
        var pad16 = this.launchpadQuadrant.bottomRight.pads[15];
        if (this.selectedGroup === 16) {
            this.pager.requestPaint(page, pad16, this.launchpad.getBrightnessVariant(this.launchpad.colors.white, this.launchpad.brightness.bright));
        } else {
            this.pager.requestPaint(page, pad16, this.launchpad.getBrightnessVariant(this.launchpad.colors.white, this.launchpad.brightness.dim));
        }

        // Highlight selected group with bright color variant (groups 1-15)
        if (this.selectedGroup && this.selectedGroup <= 15) {
            var selectedPad = this.launchpadQuadrant.bottomRight.pads[this.selectedGroup - 1];
            var groupTrackId = this.bitwig.findGroupByNumber(this.selectedGroup);

            if (groupTrackId !== null) {
                var track = this.bitwig.getTrack(groupTrackId);
                if (track) {
                    var color = track.color();
                    var launchpadColor = this.launchpad.bitwigColorToLaunchpad(
                        color.red(),
                        color.green(),
                        color.blue()
                    );
                    var brightColor = this.launchpad.getBrightnessVariant(launchpadColor, this.launchpad.brightness.bright);
                    this.pager.requestPaint(page, selectedPad, brightColor);
                }
            }
        }
    }

    /**
     * Refresh the track grid display on Launchpad
     */
    refreshTrackGrid() {
        var self = this;
        var page = this.pager.getActivePage();

        // Unlink all track grid pads
        for (var i = 0; i < this.launchpadQuadrant.bottomLeft.pads.length; i++) {
            this.launchpad.unlinkPad(this.launchpadQuadrant.bottomLeft.pads[i]);
        }

        var padMode = this.launchpadModeSwitcher.getPadMode();

        for (var encoderNum = 1; encoderNum <= 16; encoderNum++) {
            var link = this.twister.getEncoderLink(encoderNum);
            if (link) {
                var padNote = this.launchpadQuadrant.bottomLeft.pads[encoderNum - 1];
                var trackId = link.trackId;

                this.launchpad.linkPadToTrack(padNote, trackId, page);

                if (padMode === 'mute') {
                    (function(tid, pn) {
                        self.launchpad.registerPadBehavior(pn, function() {
                            var track = self.bitwig.getTrack(tid);
                            if (track) {
                                if (self.host) self.host.showPopupNotification(track.name().get());
                                track.mute().toggle();
                            }
                        }, null, self.pageMainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'solo') {
                    (function(tid, pn) {
                        self.launchpad.registerPadBehavior(pn, function() {
                            var track = self.bitwig.getTrack(tid);
                            if (track) {
                                if (self.host) self.host.showPopupNotification(track.name().get());
                                track.solo().toggle();
                            }
                        }, null, self.pageMainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'recordArm') {
                    (function(tid, pn) {
                        self.launchpad.registerPadBehavior(pn, function() {
                            var track = self.bitwig.getTrack(tid);
                            if (track) {
                                if (self.host) self.host.showPopupNotification(track.name().get());
                                for (var t = 0; t < 64; t++) {
                                    var otherTrack = self.bitwig.getTrack(t);
                                    if (otherTrack && t !== tid) {
                                        otherTrack.arm().set(false);
                                    }
                                }
                                track.arm().set(true);
                            }
                        }, null, self.pageMainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'sendA') {
                    (function(tid, pn) {
                        self.launchpad.registerPadBehavior(pn, function() {
                            var track = self.bitwig.getTrack(tid);
                            if (track) {
                                if (self.host) self.host.showPopupNotification(track.name().get() + " → Sends");
                                self.twister.linkEncodersToTrackSends(tid);
                            }
                        }, null, self.pageMainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'select') {
                    (function(tid, pn) {
                        self.launchpad.registerPadBehavior(pn, function() {
                            var track = self.bitwig.getTrack(tid);
                            if (track) {
                                self.bitwig.selectTrack(tid);
                                self.twister.linkEncodersToRemoteControls();
                                if (self.host) self.host.showPopupNotification(track.name().get() + " → Remote Controls");
                            }
                        }, null, self.pageMainControl.pageNumber);
                    })(trackId, padNote);
                }
            }
        }
    }

    /**
     * Handle track name changes for automatic re-linking
     * @param {number} trackId - Track ID (0-63)
     * @param {string} newName - New track name
     */
    handleTrackNameChange(trackId, newName) {
        if (!this.selectedGroup) {
            return;
        }

        var isInGroup = false;

        if (this.selectedGroup === 16) {
            isInGroup = this.bitwig._trackDepths[trackId] === 0;
        } else {
            var groupTrackId = this.bitwig.findGroupByNumber(this.selectedGroup);
            if (groupTrackId !== null) {
                var children = this.bitwig.getGroupChildren(groupTrackId);
                isInGroup = children.indexOf(trackId) !== -1;
            }
        }

        if (!isInGroup) {
            return;
        }

        var encoderMatch = newName.match(/\((\d+)\)/);
        var previousEncoder = this.twister.getEncoderForTrack(trackId);

        if (encoderMatch) {
            var newEncoder = parseInt(encoderMatch[1]);

            if (newEncoder >= 1 && newEncoder <= 16) {
                var existingLink = this.twister.getEncoderLink(newEncoder);
                if (existingLink && existingLink.trackId !== trackId) {
                    this.twister.unlinkEncoder(newEncoder);
                }

                if (previousEncoder && previousEncoder !== newEncoder) {
                    this.twister.unlinkEncoder(previousEncoder);
                }

                this.twister.linkEncoderToTrack(newEncoder, trackId);
            } else if (previousEncoder) {
                this.twister.unlinkEncoder(previousEncoder);
            }
        } else {
            if (previousEncoder) {
                this.twister.unlinkEncoder(previousEncoder);
            }
        }
    }

    /**
     * Sync encoder to its mapped track (using naming convention)
     * @param {number} encoderNumber - Encoder number (1-16)
     */
    syncEncoderToTrack(encoderNumber) {
        var searchString = "(" + encoderNumber + ")";

        for (var i = 0; i < 64; i++) {
            var track = this.bitwig.getTrack(i);
            if (track && track.name().get().indexOf(searchString) !== -1) {
                this.twister.linkEncoderToTrack(encoderNumber, i);
                return;
            }
        }

        this.twister.unlinkEncoder(encoderNumber);
    }

    /**
     * Sync all encoders to their mapped tracks
     */
    syncAllEncoders() {
        if (this.debug) this.println("Syncing all encoder LEDs...");
        for (var i = 1; i <= 16; i++) {
            this.syncEncoderToTrack(i);
        }
    }

    /**
     * Clear all muted tracks with flash animation
     */
    clearAllMute() {
        var modeConfig = this.launchpadModeSwitcher.modes.mute;

        this.launchpad.setPadColor(modeConfig.note, this.launchpad.colors.white);

        for (var i = 0; i < 64; i++) {
            var track = this.bitwig.getTrack(i);
            if (track && track.mute().get()) {
                track.mute().set(false);
            }
        }

        var self = this;
        if (this.host) {
            this.host.scheduleTask(function() {
                self.launchpadModeSwitcher.refresh();
            }, null, 100);
        }
    }

    /**
     * Clear all soloed tracks with flash animation
     */
    clearAllSolo() {
        var modeConfig = this.launchpadModeSwitcher.modes.solo;

        this.launchpad.setPadColor(modeConfig.note, this.launchpad.colors.white);

        for (var i = 0; i < 64; i++) {
            var track = this.bitwig.getTrack(i);
            if (track && track.solo().get()) {
                track.solo().set(false);
            }
        }

        var self = this;
        if (this.host) {
            this.host.scheduleTask(function() {
                self.launchpadModeSwitcher.refresh();
            }, null, 100);
        }
    }

    /**
     * Prepare for recording across an entire color region (bird's eye view)
     * @param {number} startMarkerIndex - First marker of region
     * @param {number} endMarkerIndex - Last marker of region
     */
    prepareRecordingAtRegion(startMarkerIndex, endMarkerIndex) {
        var markerBank = this.bitwig.getMarkerBank();
        if (!markerBank) return;

        var startMarker = markerBank.getItemAt(startMarkerIndex);
        if (!startMarker || !startMarker.exists().get()) return;

        var startPos = startMarker.position().get();

        var endPos = null;
        for (var i = endMarkerIndex + 1; i < 32; i++) {
            var nextMarker = markerBank.getItemAt(i);
            if (nextMarker && nextMarker.exists().get()) {
                endPos = nextMarker.position().get();
                break;
            }
        }

        if (endPos === null) {
            var endMarker = markerBank.getItemAt(endMarkerIndex);
            if (endMarker && endMarker.exists().get()) {
                endPos = endMarker.position().get() + 16.0;
            } else {
                endPos = startPos + 16.0;
            }
        }

        if (this.debug) {
            this.println("Preparing recording for region: markers " + startMarkerIndex + "-" + endMarkerIndex);
            this.println("  Start: " + startPos + " beats");
            this.println("  End: " + endPos + " beats");
        }

        this.bitwig.setTimeSelection(startPos, endPos);
        this.bitwig.setPlayheadPosition(startPos);

        if (this.debug) this.println("Recording prepared for region");
    }

    /**
     * Clear all armed tracks with flash animation
     */
    clearAllArm() {
        var modeConfig = this.launchpadModeSwitcher.modes.recordArm;

        this.launchpad.setPadColor(modeConfig.note, this.launchpad.colors.white);

        for (var i = 0; i < 64; i++) {
            var track = this.bitwig.getTrack(i);
            if (track && track.arm().get()) {
                track.arm().set(false);
            }
        }

        var self = this;
        if (this.host) {
            this.host.scheduleTask(function() {
                self.launchpadModeSwitcher.refresh();
            }, null, 100);
        }
    }

    /**
     * Handle Launchpad MIDI input
     * @param {number} status - MIDI status byte
     * @param {number} data1 - MIDI data1 byte
     * @param {number} data2 - MIDI data2 byte
     */
    onLaunchpadMidi(status, data1, data2) {
        if (status === 0xB0) {
            if (this.launchpadTopButtons.handleTopButtonCC(data1, data2)) {
                return;
            }
        }

        if (status === 0x90 && data2 > 0) {
            if (this.pages.handlePadPress(data1)) {
                return;
            }
        }

        if ((status === 0x90 && data2 === 0) || status === 0x80) {
            this.pages.handlePadRelease(data1);
        }
    }

    /**
     * Handle Twister MIDI input
     * @param {number} status - MIDI status byte
     * @param {number} data1 - MIDI data1 byte (CC number)
     * @param {number} data2 - MIDI data2 byte (value)
     */
    onTwisterMidi(status, data1, data2) {
        var encoderNumber = this.twister.ccToEncoder(data1);

        if (status === 0xB0) {
            this.twister.handleEncoderTurn(encoderNumber, data2);
        }

        if (status === 0xB1) {
            var pressed = data2 > 0;
            this.twister.handleEncoderPress(encoderNumber, pressed);
        }
    }

    /**
     * Handle cursor device changes for auto-remapping encoders
     * @param {string} deviceName - Name of the focused device
     */
    onDeviceChanged(deviceName) {
        if (!deviceName) return;
        this.println("Device changed: " + deviceName);

        if (deviceName === "Frequalizer Alt") {
            this.deviceMode = true;
            this.twister.unlinkAll();

            var self = this;
            this.host.scheduleTask(function() {
                var ids = self.bitwig.getDirectParamIds();
                self.println("FreqAlt direct param IDs (" + ids.length + "):");
                for (var i = 0; i < ids.length; i++) {
                    var name = self.bitwig.getDirectParamName(ids[i]);
                    self.println("  [" + i + "] " + ids[i] + " => " + name);
                }

                // Link Q1: Frequency (index 2) to encoder 1
                if (ids.length > 2) {
                    var freqId = ids[2];
                    var device = self.bitwig.getCursorDevice();
                    self.twister.linkEncoderToBehavior(1, function(value) {
                        device.setDirectParameterValueNormalized(freqId, value, 128);
                    }, null, { r: 80, g: 80, b: 255 });
                    self.println("Linked encoder 1 => " + self.bitwig.getDirectParamName(freqId));
                }
            }, null, 50);
        } else if (this.deviceMode) {
            // Leaving device mode — restore normal encoder mapping
            this.selectGroup(this.selectedGroup || 16);
        }
    }

    /**
     * Clean up on exit
     */
    exit() {
        this.twister.clearAll();
        this.launchpad.clearAll();
        this.launchpad.exitProgrammerMode();
    }
}

var Controller = {};
if (typeof module !== 'undefined') module.exports = ControllerHW;
