package dev.tradcode.groupctl.mixmachine.masterrc.events;
import dev.tradcode.groupctl.events.Event;

public record MasterTempoChanged(double bpm) implements Event { }
