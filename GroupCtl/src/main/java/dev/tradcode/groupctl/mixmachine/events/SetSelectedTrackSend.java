package dev.tradcode.groupctl.mixmachine.events;
import dev.tradcode.groupctl.events.Event;

public record SetSelectedTrackSend(int trackId, int sendId, double v) implements Event { }
