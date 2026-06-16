package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

import java.util.List;

/**
 * The current 64-slot explorer grid (top-left reading order). Lets PlaybackHandler
 * and SelectionCtl translate pad presses into beats.
 */
public record ExplorerGridChanged(List<GridSlot> slots) implements Event { }
