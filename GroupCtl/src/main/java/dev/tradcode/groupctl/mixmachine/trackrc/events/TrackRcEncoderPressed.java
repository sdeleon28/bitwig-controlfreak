package dev.tradcode.groupctl.mixmachine.trackrc.events;
import dev.tradcode.groupctl.events.Event;

public record TrackRcEncoderPressed(String name) implements Event {
    @Override
    public String toString() {
        return this.name;
    }
}
