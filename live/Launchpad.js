/**
 * Launchpad MK2 hardware abstraction (Live controller).
 *
 * Stripped-down version: only what the Live script needs.
 *  - Pad / button color primitives via raw MIDI
 *  - Click / hold gesture detection on pads (page-aware)
 *  - Side-button click handlers (page-aware)
 *  - Top-button CC handlers (page-aware)
 *  - Bitwig RGB → Launchpad palette translation
 */
class LaunchpadHW {
    constructor(deps) {
        deps = deps || {};
        this._output = deps.midiOutput || null;
        this.pager = deps.pager || null;
        this.host = deps.host || null;
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this.colors = LaunchpadHW.COLORS;
        this.buttons = LaunchpadHW.BUTTONS;
        this.sideButtons = LaunchpadHW.SIDE_BUTTONS;
        this.holdTiming = LaunchpadHW.HOLD_TIMING;

        // padNote -> { pageNumber|"null" -> { clickCallback, holdCallback, pressTime } }
        // Each page registers its own behavior on the same physical pad,
        // so we key behaviors by pageNumber to avoid one page overwriting
        // another's registration on overlapping pads.
        this._padTimers = {};
        this._sideButtonHandlers = {}; // note -> { onClick, pageNumber }
        this._topButtonHandlers = {};  // cc   -> { onClick, pageNumber }
    }

    // ---- Raw color output ----

    setPadColor(padNumber, color) {
        if (!this._output) return;
        this._output.sendMidi(0x90, padNumber, color);
    }

    setPadColorFlashing(padNumber, color) {
        if (!this._output) return;
        this._output.sendMidi(0x90, padNumber, 0);
        this._output.sendMidi(0x91, padNumber, color);
    }

    setPadColorPulsing(padNumber, color) {
        if (!this._output) return;
        this._output.sendMidi(0x92, padNumber, color);
    }

    setTopButtonColor(ccNumber, color) {
        if (!this._output) return;
        this._output.sendMidi(0xB0, ccNumber, color);
    }

    setSideButtonColor(noteNumber, color) {
        if (!this._output) return;
        this._output.sendMidi(0x90, noteNumber, color);
    }

    clearPad(padNumber) {
        this.setPadColor(padNumber, this.colors.off);
    }

    clearAll() {
        if (!this._output) return;
        for (var i = 0; i < 128; i++) {
            this._output.sendMidi(0x90, i, 0);
        }
        for (var cc = LaunchpadHW.BUTTONS.top1; cc <= LaunchpadHW.BUTTONS.top8; cc++) {
            this._output.sendMidi(0xB0, cc, 0);
        }
    }

    // ---- SysEx ----

    enterProgrammerMode() {
        if (!this._output) return;
        this._output.sendSysex("F0 00 20 29 02 18 21 01 F7");
    }

    // ---- Pad behavior (click/hold, page-aware) ----

    registerPadBehavior(padNote, clickCallback, holdCallback, pageNumber) {
        var key = (pageNumber === undefined || pageNumber === null) ? "null" : String(pageNumber);
        if (!this._padTimers[padNote]) this._padTimers[padNote] = {};
        this._padTimers[padNote][key] = {
            clickCallback: clickCallback || null,
            holdCallback: holdCallback || null,
            pressTime: null
        };
    }

    clearPadBehavior(padNote, pageNumber) {
        if (pageNumber === undefined) {
            delete this._padTimers[padNote];
            return;
        }
        var key = (pageNumber === null) ? "null" : String(pageNumber);
        if (this._padTimers[padNote]) delete this._padTimers[padNote][key];
    }

    clearAllPadBehaviors() {
        this._padTimers = {};
    }

    /**
     * Look up the behavior for a pad on the currently-active page. Falls
     * back to a "null" (page-independent) behavior if no page-specific one
     * is registered.
     */
    _activeBehavior(padNote) {
        var bucket = this._padTimers[padNote];
        if (!bucket) return null;
        if (this.pager) {
            var active = String(this.pager.getActivePage());
            if (bucket[active]) return bucket[active];
        }
        if (bucket["null"]) return bucket["null"];
        return null;
    }

    handlePadPress(padNote) {
        var behavior = this._activeBehavior(padNote);
        if (!behavior) return false;
        behavior.pressTime = Date.now();
        return true;
    }

    handlePadRelease(padNote) {
        var behavior = this._activeBehavior(padNote);
        if (!behavior) return false;
        var holdDuration = Date.now() - (behavior.pressTime || 0);
        if (holdDuration >= this.holdTiming.hold && behavior.holdCallback) {
            behavior.holdCallback();
        } else if (behavior.clickCallback) {
            behavior.clickCallback();
        }
        behavior.pressTime = null;
        return true;
    }

    // ---- Side-button click handlers (page-aware) ----

    registerSideButton(noteNumber, onClick, pageNumber) {
        this._sideButtonHandlers[noteNumber] = {
            onClick: onClick,
            pageNumber: (pageNumber === undefined) ? null : pageNumber
        };
    }

    clearSideButton(noteNumber) {
        delete this._sideButtonHandlers[noteNumber];
    }

    handleSideButtonPress(noteNumber) {
        var handler = this._sideButtonHandlers[noteNumber];
        if (!handler) return false;
        if (handler.pageNumber !== null && this.pager && handler.pageNumber !== this.pager.getActivePage()) {
            return false;
        }
        if (handler.onClick) handler.onClick();
        return true;
    }

    isSideButton(noteNumber) {
        return LaunchpadHW.SIDE_BUTTON_NOTES.indexOf(noteNumber) !== -1;
    }

    // ---- Top-button CC handlers (page-aware; pageNumber=null = always active) ----

    registerTopButton(ccNumber, onClick, pageNumber) {
        this._topButtonHandlers[ccNumber] = {
            onClick: onClick,
            pageNumber: (pageNumber === undefined) ? null : pageNumber
        };
    }

    clearTopButton(ccNumber) {
        delete this._topButtonHandlers[ccNumber];
    }

    handleTopButtonPress(ccNumber) {
        var handler = this._topButtonHandlers[ccNumber];
        if (!handler) return false;
        if (handler.pageNumber !== null && this.pager && handler.pageNumber !== this.pager.getActivePage()) {
            return false;
        }
        if (handler.onClick) handler.onClick();
        return true;
    }

    // ---- Bitwig color → Launchpad palette ----

    bitwigColorToLaunchpad(red, green, blue) {
        var r = Math.round(red * 255);
        var g = Math.round(green * 255);
        var b = Math.round(blue * 255);

        var key = (r >> 1 << 1) + ',' + (g >> 1 << 1) + ',' + (b >> 1 << 1);
        if (LaunchpadHW.BITWIG_TO_LAUNCHPAD[key] !== undefined) {
            return LaunchpadHW.BITWIG_TO_LAUNCHPAD[key];
        }

        var bestDist = Infinity;
        var bestColor = this.colors.amber;
        var entries = LaunchpadHW.BITWIG_TO_LAUNCHPAD_ENTRIES;
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var dr = r - e[0], dg = g - e[1], db = b - e[2];
            var dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) {
                bestDist = dist;
                bestColor = e[3];
            }
        }
        return bestColor;
    }
}

LaunchpadHW.COLORS = {
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

LaunchpadHW.BUTTONS = {
    top1: 104, top2: 105, top3: 106, top4: 107,
    top5: 108, top6: 109, top7: 110, top8: 111,
    // Semantic aliases for the Live controller
    up: 104, down: 105, left: 106, right: 107,
    decreaseResolution: 108, increaseResolution: 109,
    barPagePrev: 110, barPageNext: 111
};

// Side buttons run down the right edge of the Launchpad MK2.
// Names mirror the prototype's SideButton enum.
LaunchpadHW.SIDE_BUTTONS = {
    volume:    89,
    pan:       79,
    sendA:     69,
    sendB:     59,
    stop:      49,
    mute:      39,
    solo:      29,
    recordArm: 19
};

LaunchpadHW.SIDE_BUTTON_NOTES = [89, 79, 69, 59, 49, 39, 29, 19];

LaunchpadHW.HOLD_TIMING = {
    hold: 400
};

// Bitwig palette RGB (0-255, quantized to even) → Launchpad color code.
// Lifted from the existing LaunchpadHW palette table.
LaunchpadHW.BITWIG_TO_LAUNCHPAD = {
    '84,84,82':     0,
    '122,122,122':  103,
    '200,200,200':  70,
    '134,136,170':  112,
    '162,120,64':   83,
    '198,158,110':  108,
    '86,96,198':    69,
    '132,138,224':  49,
    '148,72,202':   81,
    '216,56,110':   95,
    '216,46,34':    72,
    '254,86,4':     84,
    '216,156,14':   99,
    '114,152,18':   101,
    '0,156,68':     87,
    '0,166,146':    34,
    '0,152,214':    79,
    '188,118,240':  52,
    '224,102,142':  53,
    '236,96,84':    83,
    '254,130,60':   108,
    '228,182,76':   109,
    '160,192,74':   98,
    '62,184,96':    31,
    '66,210,182':   33,
    '68,200,254':   41,
    '208,184,218':  56
};

LaunchpadHW.BITWIG_TO_LAUNCHPAD_ENTRIES = (function() {
    var map = LaunchpadHW.BITWIG_TO_LAUNCHPAD;
    var entries = [];
    for (var key in map) {
        if (map.hasOwnProperty(key)) {
            var parts = key.split(',');
            entries.push([parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), map[key]]);
        }
    }
    return entries;
})();

if (typeof module !== 'undefined') module.exports = LaunchpadHW;
