package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

public record PlaybackUpdate(double beat, boolean isPlaying) implements Event { }
