package dev.tradcode.groupctl.setlistexplorer.events;
import dev.tradcode.groupctl.events.Event;

import java.util.List;

/** The ordered song titles of the current setlist. */
public record SetlistChanged(List<String> songNames) implements Event { }
