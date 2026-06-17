package dev.tradcode.groupctl.explorer;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

public class Explorer {
    BitwigMarkersTracker markersTracker;
    BitwigPlaybackTracker playbackTracker;
    BitwigSelectionTracker selectionTracker;

    public Explorer(IEventBus bus, ControllerHost host) {
        // Calculation
        new GridCalculator(bus);

        // Painting
        new ExplorerGridPainter(bus);
        new ExplorerPageCtl(bus);

        // Input controllers
        new PlaybackHandler(bus);
        new SelectionCtl(bus);
        new ResolutionCtl(bus);

        // Bitwig trackers
        this.markersTracker = new BitwigMarkersTracker(bus, host);
        this.playbackTracker = new BitwigPlaybackTracker(bus, host);
        this.selectionTracker = new BitwigSelectionTracker(bus, host);
    }

    public void flush() {
        this.markersTracker.flush();
        this.playbackTracker.flush();
        this.selectionTracker.flush();
    }
}
