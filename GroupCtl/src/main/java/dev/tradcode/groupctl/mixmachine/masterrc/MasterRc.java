package dev.tradcode.groupctl.mixmachine.masterrc;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

public class MasterRc {
    BitwigMasterRcTracker tracker;
    BitwigTempoTracker tempoTracker;

    public MasterRc(IEventBus bus, ControllerHost host) {
        new LaunchpadMasterRcCtl(bus);
        new TwisterMasterRcCtl(bus);
        new MasterRcGrowler(bus, host);
        this.tracker = new BitwigMasterRcTracker(bus, host);
        this.tempoTracker = new BitwigTempoTracker(bus, host);
    }
}
