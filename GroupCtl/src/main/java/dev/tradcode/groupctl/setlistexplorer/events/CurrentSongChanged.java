package dev.tradcode.groupctl.setlistexplorer.events;
import dev.tradcode.groupctl.events.Event;

/**
 * Which song the setlist view is showing. {@code manual} is true when the change
 * came from a song-pager press (worth a growl) and false when it followed the
 * playhead or a marker reload.
 */
public record CurrentSongChanged(
    int index, int count, String name, double startBeat, boolean manual
) implements Event {
    @Override
    public String toString() {
        return this.name;
    }
}
