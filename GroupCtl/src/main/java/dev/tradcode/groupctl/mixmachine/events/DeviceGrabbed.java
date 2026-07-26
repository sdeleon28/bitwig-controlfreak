package dev.tradcode.groupctl.mixmachine.events;

import dev.tradcode.groupctl.events.Event;

/**
 * A device has been grabbed onto the control surface — either by tapping a
 * device pad or by pressing Send B on the device selected in Bitwig's UI. It
 * carries the device name so name-aware programs (custom mappers like the
 * Frequalizer, the generic-RC blacklist) can react, and every twister program
 * yields to it the same way regardless of how the device was grabbed.
 */
public record DeviceGrabbed(String name) implements Event {
    @Override
    public String toString() {
        return "Device: " + this.name;
    }
}
