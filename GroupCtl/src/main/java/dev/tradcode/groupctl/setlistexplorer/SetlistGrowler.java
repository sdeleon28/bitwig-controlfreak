package dev.tradcode.groupctl.setlistexplorer;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Growler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.setlistexplorer.events.CurrentSongChanged;
import dev.tradcode.groupctl.setlistexplorer.events.ShowSetlist;

/**
 * Growls the song name on a manual song switch and the whole setlist on request.
 * Auto-follow switches ({@code manual == false}) are silent.
 */
public class SetlistGrowler extends Growler {
    public SetlistGrowler(IEventBus bus, ControllerHost host) {
        super(bus, host);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case CurrentSongChanged c when c.manual() -> this.growl(c);
            case ShowSetlist s -> this.growl(s);
            default -> { }
        }
    }
}
