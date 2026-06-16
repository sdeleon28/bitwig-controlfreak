package dev.tradcode.groupctl.explorer.events;
import dev.tradcode.groupctl.events.Event;

import java.util.List;

public record MarkersChanged(List<Marker> markers) implements Event { }
