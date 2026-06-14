package dev.tradcode.groupctl.events;

public record VolModeSelected() implements Event {
    @Override
    public String toString() {
        return "Vol";
    }
}
