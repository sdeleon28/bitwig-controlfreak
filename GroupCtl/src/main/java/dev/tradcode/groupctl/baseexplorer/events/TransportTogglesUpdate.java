package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

public record TransportTogglesUpdate(
    boolean loopEnabled,
    boolean metronomeEnabled,
    boolean recordEnabled
) implements Event { }
