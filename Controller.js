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
     * @param {Object} deps.deviceMapper - DeviceMapper instance
     * @param {Object} deps.deviceQuadrant - DeviceQuadrant instance
     * @param {Object} deps.deviceSelector - DeviceSelector instance
     * @param {Object} deps.mappers - Dict of device name → twister mapper factory function
     * @param {Object} deps.padMappers - Dict of device name → pad mapper factory function
     * @param {Object} deps.painter - TwisterPainter instance
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
        this.deviceMapper = deps.deviceMapper || null;
        this.deviceQuadrant = deps.deviceQuadrant || null;
        this.deviceSelector = deps.deviceSelector || null;
        this.mappers = deps.mappers || {};
        this.padMappers = deps.padMappers || {};
        this.painter = deps.painter || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.selectedGroup = null;
        this._mode = 'grid';  // 'grid' | 'track' | 'device'
        this._activeMapper = null;
        this._multiRecValue = false;
        this._deviceChangeSeq = 0;
        this._pendingRCCheck = false;
        this._suppressNextDeviceChange = false;
        this._devicePaneShown = false;
        this._selectedDeviceIndex = null;
        this._lastDeviceName = null;
        this._masterTrackMode = false;
        this._cache = deps.mapperStateCache || new MapperCacheHW();
        this._activePadMapper = null;
    }

    get _multiRec() {
        return this._multiRecValue;
    }

    set _multiRec(value) {
        if (this._multiRecValue === value) return;
        this._multiRecValue = value;
        if (this.launchpadModeSwitcher) this.launchpadModeSwitcher.refresh();
    }

    /**
     * Initialize controller
     */
    init() {
        this.selectGroup(16);
        if (this.debug) this.println("Controller initialized");
    }

    /**
     * Toggle multi-rec mode (individual arm toggle vs XOR arm)
     */
    toggleMultiRec() {
        this._multiRec = !this._multiRec;
        if (this.host) this.host.showPopupNotification("Multi Rec: " + (this._multiRec ? "ON" : "OFF"));
        this.refreshTrackGrid();
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

        var cursorDevice = this.bitwig.getCursorDevice();
        if (cursorDevice && cursorDevice.isWindowOpen().get()) {
            cursorDevice.isWindowOpen().set(false);
        }
        if (cursorDevice) {
            cursorDevice.isRemoteControlsSectionVisible().set(false);
        }

        if ((this._mode === 'track' || this._mode === 'device') && this._devicePaneShown && this.bitwig._application) {
            this.bitwig._application.toggleDevices();
            this._devicePaneShown = false;
        }

        if (groupNumber === 16) {
            if (this.host) this.host.showPopupNotification("Top Level");

            var masterTrack = this.bitwig.getMasterTrack();
            if (masterTrack) masterTrack.selectInMixer();

            var topTracks = this.bitwig.getTopLevelTracks();

            for (var i = 0; i < topTracks.length; i++) {
                var trackId = topTracks[i];
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

        if (this.deviceQuadrant && this.deviceQuadrant.isActive()) {
            this.deviceQuadrant.deactivate();
        }
        if (this.deviceSelector && this.deviceSelector.isActive()) {
            this.deviceSelector.deactivate();
        }

        this.selectedGroup = groupNumber;
        this._mode = 'grid';
        this._activeMapper = null;
        this._activePadMapper = null;
        this._selectedDeviceIndex = null;
        this._lastDeviceName = null;
        this._masterTrackMode = false;
        this._multiRec = false;
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

                // Override linkPadToTrack's default bright color:
                // selected group = bright, unselected = dim
                if (this.selectedGroup) {
                    var track = this.bitwig.getTrack(groupTrackId);
                    if (track) {
                        var color = track.color();
                        var launchpadColor = this.launchpad.bitwigColorToLaunchpad(
                            color.red(), color.green(), color.blue()
                        );
                        var brightness = (i === this.selectedGroup)
                            ? this.launchpad.brightness.bright
                            : this.launchpad.brightness.dim;
                        this.pager.requestPaint(page, padNote,
                            this.launchpad.getBrightnessVariant(launchpadColor, brightness));
                    }
                }
            }
        }

        // Handle pad 16: white (inactive), red (top level), cyan (master track mode)
        var pad16 = this.launchpadQuadrant.bottomRight.pads[15];
        if (this._masterTrackMode) {
            this.pager.requestPaint(page, pad16, this.launchpad.getBrightnessVariant(this.launchpad.colors.cyan, this.launchpad.brightness.bright));
        } else if (this.selectedGroup === 16) {
            this.pager.requestPaint(page, pad16, this.launchpad.getBrightnessVariant(this.launchpad.colors.red, this.launchpad.brightness.bright));
        } else {
            this.pager.requestPaint(page, pad16, this.launchpad.getBrightnessVariant(this.launchpad.colors.white, this.launchpad.brightness.dim));
        }
    }

    /**
     * Refresh the track grid display on Launchpad
     */
    refreshTrackGrid() {
        if (this.deviceQuadrant && this.deviceQuadrant.isActive()) return;
        if (this.deviceSelector && this.deviceSelector.isActive()) return;

        var self = this;
        var page = this.pager.getActivePage();

        // Unlink all track grid pads and clear stale behaviors
        for (var i = 0; i < this.launchpadQuadrant.bottomLeft.pads.length; i++) {
            this.launchpad.unlinkPad(this.launchpadQuadrant.bottomLeft.pads[i]);
            this.launchpad.clearPadBehavior(this.launchpadQuadrant.bottomLeft.pads[i]);
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
                                var wasMuted = track.mute().get();
                                track.mute().toggle();
                                track.makeVisibleInArranger();
                                if (self.host) self.host.showPopupNotification((wasMuted ? "Unmute: " : "Mute: ") + track.name().get());
                            }
                        }, null, self.pageMainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'solo') {
                    (function(tid, pn) {
                        self.launchpad.registerPadBehavior(pn, function() {
                            var track = self.bitwig.getTrack(tid);
                            if (track) {
                                var wasSoloed = track.solo().get();
                                track.solo().toggle();
                                track.makeVisibleInArranger();
                                if (self.host) self.host.showPopupNotification((wasSoloed ? "Unsolo: " : "Solo: ") + track.name().get());
                            }
                        }, null, self.pageMainControl.pageNumber);
                    })(trackId, padNote);
                } else if (padMode === 'recordArm') {
                    (function(tid, pn) {
                        self.launchpad.registerPadBehavior(pn, function() {
                            var track = self.bitwig.getTrack(tid);
                            if (track) {
                                if (self._multiRec) {
                                    var wasArmed = track.arm().get();
                                    track.arm().set(!wasArmed);
                                    track.makeVisibleInArranger();
                                    if (self.host) self.host.showPopupNotification((wasArmed ? "Disarm: " : "Rec: ") + track.name().get());
                                } else {
                                    if (self.host) self.host.showPopupNotification("Rec: " + track.name().get());
                                    for (var t = 0; t < 64; t++) {
                                        var otherTrack = self.bitwig.getTrack(t);
                                        if (otherTrack && t !== tid) {
                                            otherTrack.arm().set(false);
                                        }
                                    }
                                    track.arm().set(true);
                                    track.makeVisibleInArranger();
                                }
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
                                self._suppressNextDeviceChange = true;
                                self.enterTrackMode();
                                track.makeVisibleInArranger();
                                if (self.host) self.host.showPopupNotification(track.name().get() + " → Track Mode");
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
        if (this.host) this.host.showPopupNotification("Clear All Mute");
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
        if (this.host) this.host.showPopupNotification("Clear All Solo");
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
        this._multiRec = false;
        if (this.host) this.host.showPopupNotification("Clear All Rec");
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

        if (this._activeMapper) {
            var device = this.bitwig.getCursorDevice();
            if (status === 0xB0) {
                var paramId = this._activeMapper.encoderParamId(encoderNumber);
                if (paramId && device) {
                    device.setDirectParameterValueNormalized(paramId, data2, 128);
                }
            }
            if (status === 0xB1) {
                var pressed = data2 > 0;
                this._activeMapper.notifyButtonState(encoderNumber, pressed);
                if (pressed) {
                    var clickAction = this._activeMapper.handleClick(encoderNumber);
                    if (clickAction && device) {
                        device.setDirectParameterValueNormalized(clickAction.paramId, clickAction.value, clickAction.resolution);
                    }
                    var holdAction = this._activeMapper.handleHold(encoderNumber, true);
                    if (holdAction && device) {
                        device.setDirectParameterValueNormalized(holdAction.paramId, holdAction.value, holdAction.resolution);
                    }
                } else {
                    var holdRelease = this._activeMapper.handleHold(encoderNumber, false);
                    if (holdRelease && device) {
                        device.setDirectParameterValueNormalized(holdRelease.paramId, holdRelease.value, holdRelease.resolution);
                    }
                }
            }
            return;
        }

        if (status === 0xB0) {
            this.twister.handleEncoderTurn(encoderNumber, data2);
        }

        if (status === 0xB1) {
            var pressed = data2 > 0;
            this.twister.handleEncoderPress(encoderNumber, pressed);
        }
    }

    /**
     * Enter track mode: show device selector, link track RCs to Twister.
     */
    enterTrackMode() {
        var cursorDevice = this.bitwig.getCursorDevice();
        if (cursorDevice && cursorDevice.isWindowOpen().get()) {
            cursorDevice.isWindowOpen().set(false);
        }
        if (cursorDevice) {
            cursorDevice.isRemoteControlsSectionVisible().set(false);
        }

        this._mode = 'track';
        this._masterTrackMode = false;
        this._activeMapper = null;
        this._activePadMapper = null;
        this._selectedDeviceIndex = null;
        this._lastDeviceName = null;
        if (!this._devicePaneShown && this.bitwig._application) {
            this.bitwig._application.toggleDevices();
            this._devicePaneShown = true;
        }

        if (this.host) {
            var cursorTrack = this.bitwig.getCursorTrack();
            var trackName = cursorTrack ? cursorTrack.name().get() : '';
            this.host.showPopupNotification(trackName ? trackName + " → Track Mode" : "Track Mode");
        }

        // Link track remote controls to Twister
        this.twister.linkEncodersToTrackRemoteControls();

        // Deactivate DeviceQuadrant if active
        if (this.deviceQuadrant && this.deviceQuadrant.isActive()) {
            this.deviceQuadrant.deactivate();
        }

        // Activate DeviceSelector
        var self = this;
        if (this.deviceSelector) {
            if (!this.deviceSelector.isActive()) {
                this.deviceSelector.activate(
                    function(deviceIndex) {
                        self.println("[TRACE] DeviceSelector pad pressed: deviceIndex=" + deviceIndex +
                            " _selectedDeviceIndex=" + self._selectedDeviceIndex +
                            " _lastDeviceName=" + self._lastDeviceName +
                            " _cursorDevicePosition=" + self.deviceSelector._cursorDevicePosition +
                            " _activeMapper=" + (self._activeMapper ? "SET" : "null") +
                            " _mode=" + self._mode);
                        // Double-click same device → enter device mode
                        if (deviceIndex === self._selectedDeviceIndex && self._lastDeviceName) {
                            self.println("[TRACE] → double-click detected, calling enterDeviceMode(" + self._lastDeviceName + ")");
                            self.enterDeviceMode(self._lastDeviceName);
                            return;
                        }
                        self._selectedDeviceIndex = deviceIndex;

                        if (deviceIndex === self.deviceSelector._cursorDevicePosition) {
                            // Cursor already here — observer won't fire, so trigger manually
                            var name = self.bitwig.getCursorDevice().name().get();
                            self.println("[TRACE] → cursor already at position, calling onDeviceChanged(" + name + ")");
                            if (name) self.onDeviceChanged(name);
                        } else {
                            // Navigate cursor — onDeviceChanged() will be called by Bitwig's observer
                            var deviceBank = self.bitwig.getDeviceBank();
                            if (deviceBank) {
                                var device = deviceBank.getItemAt(deviceIndex);
                                if (device) {
                                    self.bitwig.getCursorDevice().selectDevice(device);
                                    device.selectInEditor();
                                }
                            }
                        }
                    },
                    function() {
                        // Exit to grid
                        self.selectGroup(self.selectedGroup);
                    }
                );
            }
        }
    }

    /**
     * Enter master track mode: select master track, show device pane,
     * link project remote controls to Twister.
     */
    enterMasterTrackMode() {
        var masterTrack = this.bitwig.getMasterTrack();
        if (!masterTrack) return;

        var cursorDevice = this.bitwig.getCursorDevice();
        if (cursorDevice && cursorDevice.isWindowOpen().get()) {
            cursorDevice.isWindowOpen().set(false);
        }
        if (cursorDevice) {
            cursorDevice.isRemoteControlsSectionVisible().set(false);
        }

        this._mode = 'track';
        this._masterTrackMode = true;
        this._activeMapper = null;
        this._activePadMapper = null;
        this._selectedDeviceIndex = null;
        this._lastDeviceName = null;

        if (!this._devicePaneShown && this.bitwig._application) {
            this.bitwig._application.toggleDevices();
            this._devicePaneShown = true;
        }

        masterTrack.selectInMixer();

        if (this.host) this.host.showPopupNotification("Master → Track Mode");

        this.twister.linkEncodersToProjectRemoteControls();

        if (this.deviceQuadrant && this.deviceQuadrant.isActive()) {
            this.deviceQuadrant.deactivate();
        }

        var self = this;
        if (this.deviceSelector) {
            if (!this.deviceSelector.isActive()) {
                this.deviceSelector.activate(
                    function(deviceIndex) {
                        if (deviceIndex === self._selectedDeviceIndex && self._lastDeviceName) {
                            self.enterDeviceMode(self._lastDeviceName);
                            return;
                        }
                        self._selectedDeviceIndex = deviceIndex;
                        var deviceBank = self.bitwig.getDeviceBank();
                        if (deviceBank) {
                            var device = deviceBank.getItemAt(deviceIndex);
                            if (device) {
                                self.bitwig.getCursorDevice().selectDevice(device);
                                device.selectInEditor();
                            }
                        }
                    },
                    function() {
                        self.selectGroup(self.selectedGroup);
                    }
                );
            }
        }

        masterTrack.makeVisibleInArranger();
        this.refreshGroupDisplay();
    }

    /**
     * Map the current device to the Twister (custom mapper or RC fallback).
     * Does NOT change mode or touch DeviceSelector/DeviceQuadrant.
     * @param {string} deviceName - Name of the focused device
     */
    _mapDeviceToTwister(deviceName) {
        this.println("[TRACE] _mapDeviceToTwister(" + deviceName + ") called. _activeMapper was " + (this._activeMapper ? "SET" : "null") + " _mode=" + this._mode);
        this.println("[TRACE] " + new Error().stack.split('\n').slice(1, 4).join(' <- '));
        this._activeMapper = null;
        this._paramDropLogged = false;
        this.twister.unlinkAll();
        if (this.deviceMapper) this.deviceMapper.resetGenericMode();
        this._pendingRCCheck = false;
        this._deviceChangeSeq++;
        var seq = this._deviceChangeSeq;

        if (this.mappers[deviceName]) {
            this._activeMapper = this._cache.getMapper(deviceName, this.mappers[deviceName], {
                painter: this.painter,
                println: this.println
            });
            if (this._activeMapper && this._activeMapper.resync) {
                this._activeMapper.resync();
            }
        } else {
            this._pendingRCCheck = true;
            var self = this;
            if (this.host) {
                this.host.scheduleTask(function() {
                    if (self._deviceChangeSeq !== seq) return;
                    if (!self._pendingRCCheck) return;
                    self._pendingRCCheck = false;
                    var hasRC = self._deviceHasRemoteControls();
                    if (hasRC) {
                        self.twister.linkEncodersToRemoteControls();
                    } else if (self.deviceMapper) {
                        self.deviceMapper.applyGenericMapping();
                    }
                }, null, 100);
            }
        }
    }

    /**
     * Enter device mode: show device controls on pads + Twister.
     * @param {string} deviceName - Name of the focused device
     */
    enterDeviceMode(deviceName) {
        this.println("[TRACE] enterDeviceMode(" + deviceName + ") _activeMapper=" + (this._activeMapper ? "SET" : "null") + " _mode=" + this._mode);
        this._mode = 'device';
        this._masterTrackMode = false;
        this._lastDeviceName = deviceName;
        if (this.host) this.host.showPopupNotification("Device: " + deviceName);

        var cursorDevice = this.bitwig.getCursorDevice();
        if (cursorDevice && cursorDevice.isPlugin().get()) {
            cursorDevice.isWindowOpen().set(true);
        } else if (cursorDevice) {
            cursorDevice.isRemoteControlsSectionVisible().set(true);
        }

        if (!this._activeMapper) {
            this._mapDeviceToTwister(deviceName);
        }

        // Deactivate DeviceSelector if active
        if (this.deviceSelector && this.deviceSelector.isActive()) {
            this.deviceSelector.deactivate();
        }

        // Independent pad mapper lookup (instance cached)
        var padMapper = this._cache.getPadMapper(deviceName, this.padMappers[deviceName]);
        this._activePadMapper = padMapper;

        if (this.deviceQuadrant) {
            if (!this.deviceQuadrant.isActive()) {
                var self = this;
                this.deviceQuadrant.activate(function() {
                    // Exit device mode → back to track mode
                    self.enterTrackMode();
                }, padMapper);
            } else {
                this.deviceQuadrant.applyPadMapper(padMapper);
            }
        }

        this._cache.flushPendingPadParams(padMapper);
    }

    /**
     * Handle cursor device changes for auto-remapping encoders
     * @param {string} deviceName - Name of the focused device
     */
    onDeviceChanged(deviceName) {
        if (!deviceName) return;
        this._cache.onDeviceChanged(deviceName);
        this.println("[TRACE] onDeviceChanged(" + deviceName + ") _mode=" + this._mode + " _activeMapper=" + (this._activeMapper ? "SET" : "null") + " _masterTrackMode=" + this._masterTrackMode);

        if (this._masterTrackMode) {
            this._lastDeviceName = deviceName;
            if (this.host) this.host.showPopupNotification("Device: " + deviceName);
            return;
        }

        if (this._suppressNextDeviceChange) {
            this._suppressNextDeviceChange = false;
            return;
        }

        if (this._mode === 'track') {
            this._mapDeviceToTwister(deviceName);
            this._lastDeviceName = deviceName;
            if (this.host) this.host.showPopupNotification("Device: " + deviceName);
        } else if (this._mode === 'device') {
            this._activeMapper = null;
            this.enterDeviceMode(deviceName);
        } else {
            // grid mode — ignore device changes
        }
    }

    /**
     * Handle cursor track changes (for detecting track selection).
     * @param {string} name - Cursor track name
     */
    onCursorTrackChanged(name) {
        this._cache.clearAll();
        if (this._masterTrackMode) return;
        if (this._mode === 'track' || this._mode === 'device') {
            this._suppressNextDeviceChange = true;
            this.enterTrackMode();
        }
        // In grid mode: no-op
    }

    _deviceHasRemoteControls() {
        var remoteControls = this.bitwig.getRemoteControls();
        if (!remoteControls) return false;
        for (var i = 0; i < 8; i++) {
            var name = remoteControls.getParameter(i).name().get();
            if (name && name.length > 0) return true;
        }
        return false;
    }

    /**
     * Handle remote control name changes for reactive linking
     * @param {number} paramIndex - RC parameter index (0-7)
     * @param {string} name - Parameter name
     */
    onRemoteControlNameChanged(paramIndex, name) {
        if (!this._pendingRCCheck) return;
        if (!name || name.length === 0) return;
        this._pendingRCCheck = false;
        this.twister.linkEncodersToRemoteControls();
    }

    /**
     * Handle device parameter value changes (feeds active mapper)
     * @param {string} id - Parameter ID
     * @param {number} value - Normalized value (0-1)
     */
    onDeviceParamChanged(id, value) {
        var normalizedId = id.replace('ROOT_GENERIC_MODULE/', '');
        this._cache.feedParam(this._activeMapper, normalizedId, value);
        if (!this._activeMapper && !this._paramDropLogged) {
            this.println("[TRACE] onDeviceParamChanged BUFFERING (no mapper): id=" + id + " value=" + value);
            this._paramDropLogged = true;
        }
        // Buffer for pad mapper when DeviceQuadrant isn't forwarding
        if (!this.deviceQuadrant || !this.deviceQuadrant.isActive()) {
            this._cache.bufferPadParam(normalizedId, value);
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
