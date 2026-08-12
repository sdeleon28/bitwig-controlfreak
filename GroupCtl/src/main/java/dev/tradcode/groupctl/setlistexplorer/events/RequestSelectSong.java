package dev.tradcode.groupctl.setlistexplorer.events;
import dev.tradcode.groupctl.events.Event;

/** A relative song step (+1 next, -1 previous) requested by the song pager. */
public record RequestSelectSong(int delta) implements Event { }
