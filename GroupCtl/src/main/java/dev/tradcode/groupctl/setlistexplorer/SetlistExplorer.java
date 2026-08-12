package dev.tradcode.groupctl.setlistexplorer;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * The setlist explorer view: song-scoped navigation of a project that uses the
 * {@code { }} cue-marker convention. Built on top of {@code BaseExplorer}
 * (trackers, painter, shared controls); it adds its own reducer, the song and
 * bar pagers, and the setlist growl. Engages when the project has a setlist.
 */
public class SetlistExplorer {
    public SetlistExplorer(IEventBus bus, ControllerHost host) {
        new SetlistGridCalculator(bus);
        new SongPagerCtl(bus);
        new BarPagerCtl(bus);
        new SetlistGrowlCtl(bus);
        new SetlistGrowler(bus, host);
    }
}
