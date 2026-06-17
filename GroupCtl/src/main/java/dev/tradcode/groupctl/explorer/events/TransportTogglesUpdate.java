package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

public record TransportTogglesUpdate(boolean loopEnabled, boolean metronomeEnabled) implements Event { }
