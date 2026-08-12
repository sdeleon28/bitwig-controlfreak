package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

public record RequestSetRecord(boolean enabled) implements Event {
    @Override
    public String toString() {
        return this.enabled ? "Record on" : "Record off";
    }
}
