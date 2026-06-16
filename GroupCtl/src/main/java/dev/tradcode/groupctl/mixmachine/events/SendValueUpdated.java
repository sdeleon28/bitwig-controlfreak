package dev.tradcode.groupctl.mixmachine.events;
import dev.tradcode.groupctl.events.Event;

public record SendValueUpdated(int trackId, int sendId, double value) implements Event { }
