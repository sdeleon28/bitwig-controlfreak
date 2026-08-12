package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

/**
 * The in-progress selection gesture's anchor, broadcast for live feedback
 * before the gesture completes. A duration <= 0 means nothing is pending.
 */
public record PendingSelectionChanged(double startBeat, double duration) implements Event { }
