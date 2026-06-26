package dev.tradcode.groupctl.mixmachine.masterrc.events;
import dev.tradcode.groupctl.events.Event;

public record RequestNudgeTempo(int steps) implements Event { }
