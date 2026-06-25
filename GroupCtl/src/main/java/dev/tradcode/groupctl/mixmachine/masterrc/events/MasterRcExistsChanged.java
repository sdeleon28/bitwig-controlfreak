package dev.tradcode.groupctl.mixmachine.masterrc.events;
import dev.tradcode.groupctl.events.Event;

public record MasterRcExistsChanged(int id, boolean exists) implements Event { }
