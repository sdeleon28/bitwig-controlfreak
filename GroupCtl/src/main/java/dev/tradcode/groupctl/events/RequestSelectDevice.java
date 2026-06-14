package dev.tradcode.groupctl.events;

public record RequestSelectDevice(int id, String name) implements Event {
    @Override
    public String toString() {
        return "Device: " + this.name;
    }
}
