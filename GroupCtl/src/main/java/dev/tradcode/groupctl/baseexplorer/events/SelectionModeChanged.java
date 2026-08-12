package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

public record SelectionModeChanged(boolean active) implements Event { }
