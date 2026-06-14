package dev.tradcode.groupctl.events;

public record SendEncoderPressed(String trackName, String fxName) implements Event {
    @Override
    public String toString() {
        return this.trackName + " -> send -> " + this.fxName;
    }
}
