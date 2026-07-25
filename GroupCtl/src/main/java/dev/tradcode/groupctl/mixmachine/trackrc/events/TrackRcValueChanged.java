package dev.tradcode.groupctl.mixmachine.trackrc.events;
import dev.tradcode.groupctl.events.Event;

public record TrackRcValueChanged(int id, double value) implements Event { }
