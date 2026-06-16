package dev.tradcode.groupctl.mixmachine.events;
import dev.tradcode.groupctl.events.Event;

public record RcValueChanged(int id, double value) implements Event { }
