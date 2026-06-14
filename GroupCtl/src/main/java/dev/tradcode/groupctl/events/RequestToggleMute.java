package dev.tradcode.groupctl.events;

public record RequestToggleMute(int trackId, String trackName) implements Event {
    @Override
    public String toString() {
        return "Mute: " + this.trackName;
    }
}
