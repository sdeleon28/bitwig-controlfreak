package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

public record BitwigSelectionChanged(double startBeat, double duration) implements Event { }
