package dev.tradcode.groupctl.mixmachine.trackrc.events;
import dev.tradcode.groupctl.events.Event;

public record TrackRcNameChanged(int id, String name) implements Event { }
