loadAPI(24);

host.defineController("Generic", "Device Sandbox", "1.0", "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "xan_t");
host.defineMidiPorts(1, 1);  // 1 input (Twister), 1 output (Twister)

// ============================================================================
// Device Parameter Observation Spike
//
// Goal: Try every possible API for listening to parameter changes on the
// active device. Turn a knob in a plugin and check the script console to
// see which approaches fired and what values they reported.
//
// Each approach is wrapped in a try/catch so a failure in one doesn't block
// the others. Look for [TAG] prefixes in the console output.
// ============================================================================

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

    // --- Cursor Track & Device (foundation for everything) ------------------
    var cursorTrack = host.createCursorTrack("sandbox-cursor", "Sandbox Cursor", 0, 0, true);
    var cursorDevice = cursorTrack.createCursorDevice();

    cursorTrack.name().markInterested();
    cursorTrack.name().addValueObserver(function(name) {
        trace("CURSOR-TRACK", "Track name: " + name);
    });

    cursorDevice.name().markInterested();
    cursorDevice.exists().markInterested();
    cursorDevice.isEnabled().markInterested();
    cursorDevice.presetName().markInterested();
    cursorDevice.presetCategory().markInterested();
    cursorDevice.presetCreator().markInterested();
    cursorDevice.position().markInterested();

    cursorDevice.name().addValueObserver(function(name) {
        trace("DEVICE-NAME", "Device: " + name);
    });

    cursorDevice.exists().addValueObserver(function(exists) {
        trace("DEVICE-EXISTS", "exists=" + exists);
    });

    cursorDevice.isEnabled().addValueObserver(function(enabled) {
        trace("DEVICE-ENABLED", "enabled=" + enabled);
    });

    cursorDevice.presetName().addValueObserver(function(name) {
        trace("DEVICE-PRESET", "preset=" + name);
    });

    // ========================================================================
    // APPROACH 1: Direct Parameter Observers
    // These fire for ALL parameters on the device, not just remote-mapped ones
    // ========================================================================

    var directParamIds = [];
    var directParamNames = {};

    try {
        cursorDevice.addDirectParameterIdObserver(function(ids) {
            directParamIds = ids;
            trace("DIRECT-IDS", "Got " + ids.length + " parameter IDs");
            for (var i = 0; i < Math.min(ids.length, 30); i++) {
                trace("DIRECT-IDS", "  [" + i + "] " + ids[i]);
            }
            if (ids.length > 30) {
                trace("DIRECT-IDS", "  ... (" + (ids.length - 30) + " more)");
            }
        });
    } catch(e) {
        trace("DIRECT-IDS", "FAILED: " + e);
    }

    try {
        cursorDevice.addDirectParameterNameObserver(64, function(id, name) {
            directParamNames[id] = name;
            trace("DIRECT-NAME", id + " => '" + name + "'");
        });
    } catch(e) {
        trace("DIRECT-NAME", "FAILED: " + e);
    }

    try {
        cursorDevice.addDirectParameterNormalizedValueObserver(function(id, value) {
            var name = directParamNames[id] || "?";
            trace("DIRECT-VALUE", id + " (" + name + ") = " + value);
        });
    } catch(e) {
        trace("DIRECT-VALUE", "FAILED: " + e);
    }

    try {
        cursorDevice.addDirectParameterValueDisplayObserver(64, function(id, displayValue) {
            var name = directParamNames[id] || "?";
            trace("DIRECT-DISPLAY", id + " (" + name + ") display='" + displayValue + "'");
        });
    } catch(e) {
        trace("DIRECT-DISPLAY", "FAILED: " + e);
    }

    // ========================================================================
    // APPROACH 2: CursorRemoteControlsPage (8 params per page)
    // These fire for the 8 remote-control-mapped parameters
    // ========================================================================

    var remoteControls;
    try {
        remoteControls = cursorDevice.createCursorRemoteControlsPage(8);

        remoteControls.pageNames().markInterested();
        remoteControls.pageCount().markInterested();
        remoteControls.selectedPageIndex().markInterested();

        remoteControls.pageCount().addValueObserver(function(count) {
            trace("RC-PAGE", "Page count: " + count);
        });

        remoteControls.selectedPageIndex().addValueObserver(function(idx) {
            trace("RC-PAGE", "Selected page index: " + idx);
        });

        for (var rc = 0; rc < 8; rc++) {
            var param = remoteControls.getParameter(rc);
            param.markInterested();
            param.name().markInterested();
            param.value().markInterested();
            param.displayedValue().markInterested();

            (function(paramIndex, p) {
                p.name().addValueObserver(function(name) {
                    trace("RC-PARAM-NAME", "[" + paramIndex + "] name='" + name + "'");
                });

                // Normalized 0-1 float observer
                p.value().addValueObserver(function(value) {
                    trace("RC-PARAM-VALUE", "[" + paramIndex + "] " + p.name().get() + " = " + value + " (normalized 0-1)");
                });

                // 128-step integer observer
                p.value().addValueObserver(128, function(value) {
                    trace("RC-PARAM-INT128", "[" + paramIndex + "] " + p.name().get() + " = " + value + " (0-127)");
                });

                // Display string observer
                p.displayedValue().addValueObserver(function(display) {
                    trace("RC-PARAM-DISPLAY", "[" + paramIndex + "] display='" + display + "'");
                });
            })(rc, param);
        }
    } catch(e) {
        trace("RC-PAGE", "FAILED: " + e);
    }

    // ========================================================================
    // APPROACH 3: Modulated value on remote controls
    // Shows value after modulation (LFO, envelope, etc.) is applied
    // ========================================================================

    try {
        for (var mv = 0; mv < 8; mv++) {
            var modParam = remoteControls.getParameter(mv);
            modParam.modulatedValue().markInterested();

            (function(paramIndex, p) {
                p.modulatedValue().addValueObserver(function(value) {
                    trace("RC-MODULATED", "[" + paramIndex + "] " + p.name().get() + " modulated=" + value);
                });
            })(mv, modParam);
        }
    } catch(e) {
        trace("RC-MODULATED", "FAILED: " + e);
    }

    // ========================================================================
    // APPROACH 4: Second remote controls page (named, different tag)
    // Test if we can create a second independent cursor for the same device
    // ========================================================================

    try {
        var remoteControls2 = cursorDevice.createCursorRemoteControlsPage("sandbox-alt", 8, "");

        for (var rc2 = 0; rc2 < 8; rc2++) {
            var param2 = remoteControls2.getParameter(rc2);
            param2.markInterested();
            param2.name().markInterested();
            param2.value().markInterested();

            (function(paramIndex, p) {
                p.value().addValueObserver(function(value) {
                    trace("RC2-VALUE", "[" + paramIndex + "] " + p.name().get() + " = " + value);
                });
            })(rc2, param2);
        }
    } catch(e) {
        trace("RC2-VALUE", "FAILED: " + e);
    }

    // ========================================================================
    // APPROACH 5: Device-level parameter page observers (legacy)
    // ========================================================================

    try {
        cursorDevice.addSelectedPageObserver(-1, function(pageIndex) {
            trace("LEGACY-PAGE", "Selected parameter page: " + pageIndex);
        });
    } catch(e) {
        trace("LEGACY-PAGE", "FAILED: " + e);
    }

    try {
        cursorDevice.addPageNamesObserver(function(names) {
            trace("LEGACY-PAGENAMES", "Page names: " + names.join(", "));
        });
    } catch(e) {
        trace("LEGACY-PAGENAMES", "FAILED: " + e);
    }

    // ========================================================================
    // APPROACH 6: SpecificBitwigDevice / SpecificPluginDevice
    // For accessing internal parameters of known device types
    // ========================================================================

    try {
        var specificDevice = cursorDevice.createSpecificBitwigDevice("00000000-0000-0000-0000-000000000000");
        trace("SPECIFIC-BW", "Created specific Bitwig device cursor (placeholder UUID)");
    } catch(e) {
        trace("SPECIFIC-BW", "FAILED (expected): " + e);
    }

    // ========================================================================
    // APPROACH 7: Device isPlugin / isWindowOpen / hasSlottedInsertionPoint
    // Metadata observers to understand what kind of device we're looking at
    // ========================================================================

    try {
        cursorDevice.isPlugin().markInterested();
        cursorDevice.isPlugin().addValueObserver(function(isPlugin) {
            trace("DEVICE-META", "isPlugin=" + isPlugin);
        });
    } catch(e) {
        trace("DEVICE-META-PLUGIN", "FAILED: " + e);
    }

    try {
        cursorDevice.isWindowOpen().markInterested();
        cursorDevice.isWindowOpen().addValueObserver(function(isOpen) {
            trace("DEVICE-META", "isWindowOpen=" + isOpen);
        });
    } catch(e) {
        trace("DEVICE-META-WINDOW", "FAILED: " + e);
    }

    try {
        cursorDevice.hasLayers().markInterested();
        cursorDevice.hasLayers().addValueObserver(function(hasLayers) {
            trace("DEVICE-META", "hasLayers=" + hasLayers);
        });
    } catch(e) {
        trace("DEVICE-META-LAYERS", "FAILED: " + e);
    }

    try {
        cursorDevice.hasDrumPads().markInterested();
        cursorDevice.hasDrumPads().addValueObserver(function(hasDrumPads) {
            trace("DEVICE-META", "hasDrumPads=" + hasDrumPads);
        });
    } catch(e) {
        trace("DEVICE-META-DRUMPADS", "FAILED: " + e);
    }

    try {
        cursorDevice.hasSlots().markInterested();
        cursorDevice.hasSlots().addValueObserver(function(hasSlots) {
            trace("DEVICE-META", "hasSlots=" + hasSlots);
        });
    } catch(e) {
        trace("DEVICE-META-SLOTS", "FAILED: " + e);
    }

    // ========================================================================
    // APPROACH 8: DeviceBank on cursor track
    // Observe multiple devices on the track, not just the selected one
    // ========================================================================

    try {
        var deviceBank = cursorTrack.createDeviceBank(8);
        deviceBank.itemCount().markInterested();
        deviceBank.itemCount().addValueObserver(function(count) {
            trace("DEVICE-BANK", "Device count on track: " + count);
        });

        for (var db = 0; db < 8; db++) {
            var bankDevice = deviceBank.getDevice(db);
            bankDevice.exists().markInterested();
            bankDevice.name().markInterested();

            (function(deviceIndex, dev) {
                dev.name().addValueObserver(function(name) {
                    if (name) {
                        trace("DEVICE-BANK", "[" + deviceIndex + "] device='" + name + "'");
                    }
                });
            })(db, bankDevice);
        }
    } catch(e) {
        trace("DEVICE-BANK", "FAILED: " + e);
    }

    // ========================================================================
    // APPROACH 9: Cursor track remote controls (track-level, not device-level)
    // Some hosts expose track-level remote controls
    // ========================================================================

    try {
        var trackRemoteControls = cursorTrack.createCursorRemoteControlsPage("track-rc", 8, "");

        for (var trc = 0; trc < 8; trc++) {
            var trackParam = trackRemoteControls.getParameter(trc);
            trackParam.markInterested();
            trackParam.name().markInterested();
            trackParam.value().markInterested();

            (function(paramIndex, p) {
                p.value().addValueObserver(function(value) {
                    trace("TRACK-RC", "[" + paramIndex + "] " + p.name().get() + " = " + value);
                });
            })(trc, trackParam);
        }
    } catch(e) {
        trace("TRACK-RC", "FAILED: " + e);
    }

    // ========================================================================
    // APPROACH 10: Parameter value via raw observer (addRawValueObserver)
    // Alternative observer that gives unnormalized raw values
    // ========================================================================

    try {
        for (var raw = 0; raw < 8; raw++) {
            var rawParam = remoteControls.getParameter(raw);

            (function(paramIndex, p) {
                p.value().addRawValueObserver(function(value) {
                    trace("RC-RAW", "[" + paramIndex + "] " + p.name().get() + " raw=" + value);
                });
            })(raw, rawParam);
        }
    } catch(e) {
        trace("RC-RAW", "FAILED: " + e);
    }

    // ========================================================================
    // APPROACH 11: Cursor device position() and chain info
    // ========================================================================

    try {
        cursorDevice.position().addValueObserver(function(position) {
            trace("DEVICE-POS", "Device position in chain: " + position);
        });
    } catch(e) {
        trace("DEVICE-POS", "FAILED: " + e);
    }

    // ========================================================================
    // LED feedback: light up encoder 0 to confirm script is running
    // ========================================================================

    try {
        twisterOut.sendMidi(0xB1, 0, 65);  // Encoder 0 = blue
        twisterOut.sendMidi(0xB2, 0, 47);  // Full brightness
        trace("INIT", "Twister LED confirmation sent on encoder 0");
    } catch(e) {
        trace("INIT", "Twister LED failed: " + e);
    }

    trace("INIT", "==================================================");
    trace("INIT", "DeviceSandbox ready. Select a device in Bitwig,");
    trace("INIT", "then move a parameter. Check console for [TAG] output.");
    trace("INIT", "==================================================");
}

function flush() {
    // Nothing to flush in this spike
}

function exit() {
    trace("EXIT", "DeviceSandbox shutting down");
}
