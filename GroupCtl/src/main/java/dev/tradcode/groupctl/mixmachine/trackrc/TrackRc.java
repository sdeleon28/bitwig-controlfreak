package dev.tradcode.groupctl.mixmachine.trackrc;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

public class TrackRc {
    BitwigTrackRcTracker tracker;

    public TrackRc(IEventBus bus, ControllerHost host) {
        new TwisterTrackRcCtl(bus);
        new TrackRcGrowler(bus, host);
        this.tracker = new BitwigTrackRcTracker(bus, host);
    }
}
