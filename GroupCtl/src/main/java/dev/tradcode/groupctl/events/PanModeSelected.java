package dev.tradcode.groupctl.events;

public record PanModeSelected() implements Event {
    @Override
    public String toString() {
        return "Pan";
    }
}
