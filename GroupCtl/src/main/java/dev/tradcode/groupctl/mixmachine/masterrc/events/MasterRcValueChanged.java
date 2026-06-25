package dev.tradcode.groupctl.mixmachine.masterrc.events;
import dev.tradcode.groupctl.events.Event;

public record MasterRcValueChanged(int id, double value) implements Event { }
