package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

public record PlaybackPositionChanged(double beat) implements Event { }
