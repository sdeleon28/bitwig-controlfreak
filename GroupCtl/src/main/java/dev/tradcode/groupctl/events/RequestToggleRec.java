package dev.tradcode.groupctl.events;

public record RequestToggleRec(int trackId, String trackName) implements Event {
    @Override
    public String toString() {
        return "Rec: " + this.trackName;
    }
}
