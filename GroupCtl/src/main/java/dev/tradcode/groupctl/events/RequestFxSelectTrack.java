package dev.tradcode.groupctl.events;

public record RequestFxSelectTrack(int trackId, String trackName) implements Event {
    @Override
    public String toString() {
        return "FX: " + this.trackName;
    }
}
