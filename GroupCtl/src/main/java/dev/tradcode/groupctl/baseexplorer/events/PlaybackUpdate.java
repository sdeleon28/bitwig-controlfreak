package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

public record PlaybackUpdate(double beat, boolean isPlaying) implements Event { }
