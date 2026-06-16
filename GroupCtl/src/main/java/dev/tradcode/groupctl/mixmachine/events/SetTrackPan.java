package dev.tradcode.groupctl.mixmachine.events;
import dev.tradcode.groupctl.events.Event;

public record SetTrackPan(int id, double v) implements Event { }
