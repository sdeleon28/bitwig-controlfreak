package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

public record RequestSetPlaybackPosition(double beat) implements Event { }
