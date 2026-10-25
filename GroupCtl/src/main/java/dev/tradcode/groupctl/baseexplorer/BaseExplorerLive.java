package dev.tradcode.groupctl.baseexplorer;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * The part of {@link BaseExplorer} that is not about the Launchpad grid: the
 * markers, the transport, and which explorer view the markers call for.
 */
public class BaseExplorerLive {
    BitwigMarkersTracker markersTracker;
    BitwigPlaybackTracker playbackTracker;

    public BaseExplorerLive(IEventBus bus, ControllerHost host) {
        new ExplorerModeCoordinator(bus);
        this.markersTracker = new BitwigMarkersTracker(bus, host);
        this.playbackTracker = new BitwigPlaybackTracker(bus, host);
    }

    public void flush() {
        this.markersTracker.flush();
        this.playbackTracker.flush();
    }
}
