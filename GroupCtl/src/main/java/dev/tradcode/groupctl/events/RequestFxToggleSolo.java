package dev.tradcode.groupctl.events;

public record RequestFxToggleSolo(int trackId, String trackName) implements Event {
    @Override
    public String toString() {
        return "Solo: " + this.trackName;
    }
}
