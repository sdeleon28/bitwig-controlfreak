package dev.tradcode.groupctl.baseexplorer;

import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.MarkersChanged;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

/**
 * Single source of truth for which explorer engages the shared page. Parses the
 * markers on every change and broadcasts {@link ExplorerModeChanged} only when
 * the answer flips, so the normal and setlist views can gate themselves on it
 * without knowing about each other.
 */
public class ExplorerModeCoordinator implements IEventBusSubscriber {
    IEventBus bus;
    final SongParser parser = new SongParser();
    boolean setlist = false;

    public ExplorerModeCoordinator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case MarkersChanged(var markers) -> {
                boolean s = !this.parser.groupSongs(markers).isEmpty();
                if (s != this.setlist) {
                    this.setlist = s;
                    this.bus.send(new ExplorerModeChanged(s));
                }
            }
            default -> { }
        }
    }
}
