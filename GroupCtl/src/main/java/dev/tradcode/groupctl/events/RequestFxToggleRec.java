package dev.tradcode.groupctl.events;

public record RequestFxToggleRec(int trackId, String trackName) implements Event {
    @Override
    public String toString() {
        return "Rec: " + this.trackName;
    }
}
