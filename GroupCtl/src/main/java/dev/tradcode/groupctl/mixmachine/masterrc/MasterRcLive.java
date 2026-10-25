package dev.tradcode.groupctl.mixmachine.masterrc;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

public class MasterRcLive {
    BitwigMasterRcTracker tracker;
    BitwigTempoTracker tempoTracker;

    public MasterRcLive(IEventBus bus, ControllerHost host) {
        new TwisterMasterRcCtl(bus);
        new MasterRcGrowler(bus, host);
        this.tracker = new BitwigMasterRcTracker(bus, host);
        this.tempoTracker = new BitwigTempoTracker(bus, host);
    }
}
