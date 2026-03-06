// ---------------------------------------------------------------------------
// FrequalizerPadMapper — Maps Frequalizer mode buttons to Launchpad pads
// ---------------------------------------------------------------------------

var FREQ_PAD_CONFIG = [
    { pad: 9, paramName: 'Mode', value: 0, resolution: 5, selectedColor: 21, deselectedColor: 1, selectedWhen: [0] },
    { pad: 5, paramName: 'Mode', value: 1, resolution: 5, selectedColor: 21, deselectedColor: 1, selectedWhen: [1, 3] },
    { pad: 6, paramName: 'Mode', value: 2, resolution: 5, selectedColor: 21, deselectedColor: 1, selectedWhen: [2, 4] },
    { pad: 1, paramName: 'Mode', value: 3, resolution: 5, selectedColor: 21, deselectedColor: 1, selectedWhen: [3] },
    { pad: 2, paramName: 'Mode', value: 4, resolution: 5, selectedColor: 21, deselectedColor: 1, selectedWhen: [4] },
];

class FrequalizerPadMapper {
    constructor() {
        this._api = null;
        this._padEntries = [];
        this._pendingPadEntries = [];
        this._modeParamId = null;
        this._currentModeValue = -1;
        this._deferredParamValues = {};
    }

    /**
     * Activate the pad mapper with a QuadrantAPI.
     * Resolves param names, registers click behaviors, paints pads.
     * @param {Object} api - QuadrantAPI { paintPad, registerPadBehavior, resolveParamName, setDeviceParam }
     */
    activate(api) {
        this._api = api;
        this._padEntries = [];
        this._pendingPadEntries = [];
        this._modeParamId = null;
        this._currentModeValue = -1;
        this._deferredParamValues = {};

        for (var i = 0; i < FREQ_PAD_CONFIG.length; i++) {
            var entry = FREQ_PAD_CONFIG[i];
            var paramId = api.resolveParamName(entry.paramName);
            if (!paramId) {
                this._pendingPadEntries.push(entry);
                continue;
            }
            this._registerPadEntry(entry, paramId);
        }

        if (this._padEntries.length > 0 && this._currentModeValue >= 0) {
            this._repaintPadHighlights();
        }
    }

    /**
     * Return cacheable state (only learned values, not structural config).
     * @returns {Object} State snapshot
     */
    getState() {
        return { currentModeValue: this._currentModeValue };
    }

    /**
     * Restore cached state. Must be called AFTER activate() so _padEntries exist.
     * @param {Object} state - State snapshot from getState()
     */
    restoreState(state) {
        if (state && state.currentModeValue !== undefined) {
            this._currentModeValue = state.currentModeValue;
            if (this._padEntries.length > 0 && this._currentModeValue >= 0) {
                this._repaintPadHighlights();
            }
        }
    }

    /**
     * Deactivate the pad mapper, clearing all internal state.
     */
    deactivate() {
        this._api = null;
        this._padEntries = [];
        this._pendingPadEntries = [];
        this._modeParamId = null;
        this._currentModeValue = -1;
        this._deferredParamValues = {};
    }

    /**
     * Called when a direct parameter value changes.
     * Repaints pad highlights when the tracked mode param changes.
     * @param {string} id - Parameter ID
     * @param {number} value - Normalized value (0-1)
     */
    onParamValueChanged(id, value) {
        if (!this._modeParamId) {
            this._deferredParamValues[id] = value;
            return;
        }
        if (id !== this._modeParamId) return;
        this._currentModeValue = value;
        this._repaintPadHighlights();
    }

    /**
     * Called when a direct parameter name is resolved.
     * Registers any pending pad entries that match this name.
     * @param {string} id - Parameter ID
     * @param {string} name - Parameter display name
     */
    onDirectParamNameChanged(id, name) {
        if (this._pendingPadEntries.length === 0) return;

        var remaining = [];
        var resolved = false;
        for (var i = 0; i < this._pendingPadEntries.length; i++) {
            var entry = this._pendingPadEntries[i];
            if (entry.paramName === name) {
                this._registerPadEntry(entry, id);
                resolved = true;
            } else {
                remaining.push(entry);
            }
        }
        this._pendingPadEntries = remaining;

        if (resolved && this._padEntries.length > 0 && this._currentModeValue >= 0) {
            this._repaintPadHighlights();
        }
    }

    /**
     * Register a single pad entry: store state, register click behavior, paint deselected.
     * @param {Object} entry - Config entry from FREQ_PAD_CONFIG
     * @param {string} paramId - Resolved parameter ID
     */
    _registerPadEntry(entry, paramId) {
        var resolution = entry.resolution;

        // Pre-normalize selectedWhen values
        var selectedWhenNormalized = [];
        var selectedWhen = entry.selectedWhen || [entry.value];
        for (var i = 0; i < selectedWhen.length; i++) {
            selectedWhenNormalized.push(selectedWhen[i] / (resolution - 1));
        }

        this._padEntries.push({
            padIndex: entry.pad,
            paramId: paramId,
            setNormalized: entry.value / (resolution - 1),
            selectedColor: entry.selectedColor,
            deselectedColor: entry.deselectedColor,
            selectedWhenNormalized: selectedWhenNormalized
        });

        // Track the mode param (all entries share the same param)
        if (!this._modeParamId) {
            this._modeParamId = paramId;
            if (this._deferredParamValues[paramId] !== undefined) {
                this._currentModeValue = this._deferredParamValues[paramId];
            }
            this._deferredParamValues = {};
        }

        // Register click: set the parameter to this pad's raw value
        var self = this;
        (function(pid, rawValue, res) {
            self._api.registerPadBehavior(entry.pad, function() {
                self._api.setDeviceParam(pid, rawValue, res);
            });
        })(paramId, entry.value, entry.resolution);

        // Paint deselected initially
        this._api.paintPad(entry.pad, entry.deselectedColor);
    }

    /**
     * Repaint all configured pad highlights based on current mode value.
     */
    _repaintPadHighlights() {
        var EPSILON = 0.01;
        for (var i = 0; i < this._padEntries.length; i++) {
            var entry = this._padEntries[i];
            var isActive = false;
            for (var j = 0; j < entry.selectedWhenNormalized.length; j++) {
                if (Math.abs(entry.selectedWhenNormalized[j] - this._currentModeValue) < EPSILON) {
                    isActive = true;
                    break;
                }
            }
            var color = isActive ? entry.selectedColor : entry.deselectedColor;
            this._api.paintPad(entry.padIndex, color);
        }
    }
}

if (typeof module !== 'undefined') module.exports = FrequalizerPadMapper;
