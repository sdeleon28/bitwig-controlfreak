package dev.tradcode.groupctl.events;

/** Emitted by Explorer with the number of internal explorer pages available. */
public record ExplorerPagesChanged(int totalPages) implements Event { }
