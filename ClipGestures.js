/**
 * Declarative gesture configuration for clip launcher
 * Fluent API for configuring click, hold, and modifier behaviors
 */
class ClipGestures {
    /**
     * @param {Object} deps
     * @param {Object} deps.launchpad - Launchpad instance (setTopButtonColor, colors, buttons)
     * @param {Object} deps.clipLauncher - ClipLauncher instance (used as `this` in callbacks)
     */
    constructor(deps) {
        this.launchpad = deps.launchpad;
        this.clipLauncher = deps.clipLauncher;
        this._clickFn = null;
        this._holdFn = null;
        this._modifiers = {};
        this._activeModifier = null;
    }

    click(fn) {
        this._clickFn = fn;
        return this;
    }

    hold(fn) {
        this._holdFn = fn;
        return this;
    }

    modifier(cc, config) {
        this._modifiers[cc] = config;
        return this;
    }

    handleModifierPress(cc) {
        var mod = this._modifiers[cc];
        if (mod) {
            this._activeModifier = cc;
            this.launchpad.setTopButtonColor(cc, mod.color);
            return true;
        }
        return false;
    }

    handleModifierRelease(cc) {
        if (this._modifiers[cc]) {
            this._activeModifier = null;
            this.launchpad.setTopButtonColor(cc, this.launchpad.colors.off);
            var mod = this._modifiers[cc];
            if (mod.onRelease) mod.onRelease.call(this.clipLauncher);
            return true;
        }
        return false;
    }

    executeClick(t, s, slot) {
        var fn = this._clickFn;
        if (this._activeModifier) {
            var mod = this._modifiers[this._activeModifier];
            if (mod && mod.click) fn = mod.click;
        }
        if (fn) fn.call(this.clipLauncher, t, s, slot);
    }

    executeHold(t, s, slot) {
        var fn = this._holdFn;
        if (this._activeModifier) {
            var mod = this._modifiers[this._activeModifier];
            if (mod && mod.hold) fn = mod.hold;
        }
        if (fn) fn.call(this.clipLauncher, t, s, slot);
    }
}

if (typeof module !== 'undefined') module.exports = ClipGestures;
