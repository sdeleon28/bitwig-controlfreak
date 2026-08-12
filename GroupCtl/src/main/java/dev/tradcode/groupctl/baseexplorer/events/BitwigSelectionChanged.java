package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

public record BitwigSelectionChanged(double startBeat, double duration) implements Event { }
