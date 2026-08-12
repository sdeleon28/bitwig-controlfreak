package dev.tradcode.groupctl.setlistexplorer.events;
import dev.tradcode.groupctl.events.Event;

/** Request to growl the whole setlist; carries the already-formatted text. */
public record ShowSetlist(String text) implements Event {
    @Override
    public String toString() {
        return this.text;
    }
}
