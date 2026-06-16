package dev.tradcode.groupctl.events;

/**
 * One displayed explorer pad's beat range. Carried by {@link ExplorerGridChanged}
 * so handlers can map a pad press back to a beat without knowing the layout.
 * empty == true means the pad shows nothing and is not seekable.
 */
public record GridSlot(boolean empty, double startBeat, double endBeat) { }
