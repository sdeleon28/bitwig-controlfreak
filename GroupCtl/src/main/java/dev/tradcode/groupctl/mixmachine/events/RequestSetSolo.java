package dev.tradcode.groupctl.mixmachine.events;
import dev.tradcode.groupctl.events.Event;

public record RequestSetSolo(int trackId, String trackName, boolean solo) implements Event { }
