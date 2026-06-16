package dev.tradcode.groupctl.events;

import java.util.List;

public record MarkersChanged(List<Marker> markers) implements Event { }
