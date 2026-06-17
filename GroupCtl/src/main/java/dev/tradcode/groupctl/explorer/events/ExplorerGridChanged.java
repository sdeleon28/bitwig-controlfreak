package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

import java.util.List;

public record ExplorerGridChanged(List<GridSlot> slots, int totalPages, int page) implements Event { }
