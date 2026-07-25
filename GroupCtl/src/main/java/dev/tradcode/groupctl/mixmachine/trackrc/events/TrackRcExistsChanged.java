package dev.tradcode.groupctl.mixmachine.trackrc.events;
import dev.tradcode.groupctl.events.Event;

public record TrackRcExistsChanged(int id, boolean exists) implements Event { }
