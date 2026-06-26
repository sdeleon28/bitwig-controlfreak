package dev.tradcode.groupctl.mixmachine.masterrc.events;
import dev.tradcode.groupctl.events.Event;

public record MasterRcNameChanged(int id, String name) implements Event { }
