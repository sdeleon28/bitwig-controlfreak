package dev.tradcode.groupctl.mixmachine.masterrc.events;
import dev.tradcode.groupctl.events.Event;

public record MasterRcEncoderPressed(String name) implements Event {
    @Override
    public String toString() {
        return this.name;
    }
}
