package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

public record SelectionModeChanged(boolean active) implements Event { }
