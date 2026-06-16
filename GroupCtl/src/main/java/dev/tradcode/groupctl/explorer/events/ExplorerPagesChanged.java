package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

/** Emitted by Explorer with the number of internal explorer pages available. */
public record ExplorerPagesChanged(int totalPages) implements Event { }
