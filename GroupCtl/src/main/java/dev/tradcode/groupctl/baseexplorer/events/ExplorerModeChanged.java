package dev.tradcode.groupctl.baseexplorer.events;
import dev.tradcode.groupctl.events.Event;

/**
 * Which explorer engages the shared page: {@code setlist} is true when the
 * project defines at least one complete {@code { … }} song, false otherwise.
 */
public record ExplorerModeChanged(boolean setlist) implements Event { }
