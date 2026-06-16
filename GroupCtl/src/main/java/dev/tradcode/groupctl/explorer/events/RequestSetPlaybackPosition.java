package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

public record RequestSetPlaybackPosition(double beat) implements Event { }
