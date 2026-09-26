package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

/** Moves the playhead without starting playback. */
public record RequestSeek(double beat) implements Event { }
