package dev.tradcode.groupctl.events;

/** Emitted by ExplorerPageCtl when the active internal explorer page changes. */
public record ExplorerPageChanged(int page) implements Event { }
