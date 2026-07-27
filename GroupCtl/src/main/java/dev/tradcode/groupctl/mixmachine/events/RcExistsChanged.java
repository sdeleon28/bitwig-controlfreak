package dev.tradcode.groupctl.mixmachine.events;
import dev.tradcode.groupctl.events.Event;

public record RcExistsChanged(int id, boolean exists) implements Event { }
