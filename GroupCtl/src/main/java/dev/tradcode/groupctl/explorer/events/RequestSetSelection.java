package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

public record RequestSetSelection(double startBeat, double endBeat) implements Event { }
