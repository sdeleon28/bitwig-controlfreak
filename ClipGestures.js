/**
 * Declarative gesture configuration for clip launcher
 * Fluent API for configuring click, hold, and modifier behaviors
 * @namespace
 */
var ClipGestures = {
    _clickFn: null,
    _holdFn: null,
    _modifiers: {},        // { cc: { name, color, click, hold } }
    _activeModifier: null, // Currently held modifier CC

    click: function(fn) {
        this._clickFn = fn;
        return this;
    },

    hold: function(fn) {
        this._holdFn = fn;
        return this;
    },

    modifier: function(cc, config) {
        this._modifiers[cc] = config;
        return this;
    },

    // Called by handleTopButtonCC
    handleModifierPress: function(cc) {
        var mod = this._modifiers[cc];
        if (mod) {
            this._activeModifier = cc;
            Launchpad.setTopButtonColor(cc, mod.color);
            return true;
        }
        return false;
    },

    handleModifierRelease: function(cc) {
        if (this._modifiers[cc]) {
            this._activeModifier = null;
            Launchpad.setTopButtonColor(cc, Launchpad.colors.off);
            // Reset any modifier-specific state
            var mod = this._modifiers[cc];
            if (mod.onRelease) mod.onRelease.call(ClipLauncher);
            return true;
        }
        return false;
    },

    // Called by pad click/hold
    executeClick: function(t, s, slot) {
        var fn = this._clickFn;
        if (this._activeModifier) {
            var mod = this._modifiers[this._activeModifier];
            if (mod && mod.click) fn = mod.click;
        }
        if (fn) fn.call(ClipLauncher, t, s, slot);
    },

    executeHold: function(t, s, slot) {
        var fn = this._holdFn;
        if (this._activeModifier) {
            var mod = this._modifiers[this._activeModifier];
            if (mod && mod.hold) fn = mod.hold;
        }
        if (fn) fn.call(ClipLauncher, t, s, slot);
    }
};

// Configure clip launcher gestures
ClipGestures
    .click(function(t, s, slot) {
        // Cancel recording if in progress
        if (slot.isRecording().get() || slot.isRecordingQueued().get()) {
            this._trackBank.getItemAt(t).stop();
            return;
        }
        // Launch if has content, otherwise record
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
