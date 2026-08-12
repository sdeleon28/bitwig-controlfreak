package dev.tradcode.groupctl.baseexplorer;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * Shared substrate both explorer views build on: the mode coordinator, the grid
 * painter, the input controllers that behave identically in either view
 * (selection, playback, resolution, transport toggles), the growler, and the
 * bitwig trackers. Constructed once; the normal and setlist feature packages
 * add only their own reducers and paging controls on top.
 *
 * <p>The mode coordinator is constructed first so it is subscribed ahead of the
 * feature reducers: a marker change delivers {@code ExplorerModeChanged} to a
 * reducer before that same change reaches it, so it always reduces with the
 * correct engagement.
 */
public class BaseExplorer {
    BitwigMarkersTracker markersTracker;
    BitwigPlaybackTracker playbackTracker;
    BitwigSelectionTracker selectionTracker;

    public BaseExplorer(IEventBus bus, ControllerHost host) {
        // Mode coordination
        new ExplorerModeCoordinator(bus);

        // Painting
        new ExplorerGridPainter(bus);

        // Shared input controllers
        new PlaybackHandler(bus);
        new SelectionCtl(bus);
        new ResolutionCtl(bus);
        new TransportTogglesCtl(bus);

        // Growls
        new ExplorerGrowler(bus, host);

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
