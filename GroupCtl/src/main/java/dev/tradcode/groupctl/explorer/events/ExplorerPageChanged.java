package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

/** Emitted by ExplorerPageCtl when the active internal explorer page changes. */
public record ExplorerPageChanged(int page) implements Event { }
