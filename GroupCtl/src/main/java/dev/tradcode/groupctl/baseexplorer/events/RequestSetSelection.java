package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

public record RequestSetSelection(double startBeat, double endBeat) implements Event { }
