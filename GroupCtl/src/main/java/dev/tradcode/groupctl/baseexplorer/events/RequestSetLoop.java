package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

public record RequestSetLoop(boolean enabled) implements Event {
    @Override
    public String toString() {
        return this.enabled ? "Loop on" : "Loop off";
    }
}
