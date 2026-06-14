package dev.tradcode.groupctl.events;

public record PadModeUpdated(PadMode mode) implements Event {
    @Override
    public String toString() {
        return "Pad mode: " + this.mode;
    }
}
