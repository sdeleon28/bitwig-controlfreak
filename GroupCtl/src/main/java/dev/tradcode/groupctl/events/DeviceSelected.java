package dev.tradcode.groupctl.events;

/** A device was selected; growled as the device name. */
public record DeviceSelected(String name) implements Event {
    @Override
    public String toString() {
        return "Device: " + this.name;
    }
}
