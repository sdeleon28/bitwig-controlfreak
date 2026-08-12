package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

/**
 * How many one-bar blocks the currently engaged explorer view spans. Drives the
 * resolution auto-fit, decoupling it from the raw marker set so the same
 * {@code ResolutionCtl} fits the whole project (normal) or a single song
 * (setlist) depending on which view is active.
 */
public record ContentBarsChanged(int bars) implements Event { }
