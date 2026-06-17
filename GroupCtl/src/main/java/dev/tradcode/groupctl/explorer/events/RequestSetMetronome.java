package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

public record RequestSetMetronome(boolean enabled) implements Event {
    @Override
    public String toString() {
        return this.enabled ? "Metronome on" : "Metronome off";
    }
}
