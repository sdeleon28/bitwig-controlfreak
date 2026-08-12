package dev.tradcode.groupctl.baseexplorer;

import dev.tradcode.groupctl.baseexplorer.events.Marker;
import java.util.List;

/**
 * A contiguous span of the arrangement delimited by a {@code { name} opener and
 * a {@code }} closer. {@code endBeat} is the closer's beat and is treated as
 * exclusive when locating the song under a playhead. {@code markers} holds the
 * opener, any section markers, and the closer, in position order.
 */
public record Song(String name, double startBeat, double endBeat, List<Marker> markers) { }
