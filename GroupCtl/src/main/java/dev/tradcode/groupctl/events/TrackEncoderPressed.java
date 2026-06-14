package dev.tradcode.groupctl.events;

public record TrackEncoderPressed(String trackName) implements Event {
    @Override
    public String toString() {
        return this.trackName;
    }
}
