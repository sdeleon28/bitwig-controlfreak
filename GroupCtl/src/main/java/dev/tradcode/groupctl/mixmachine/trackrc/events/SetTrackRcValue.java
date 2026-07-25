package dev.tradcode.groupctl.mixmachine.trackrc.events;
import dev.tradcode.groupctl.events.Event;

public record SetTrackRcValue(int id, double value) implements Event { }
