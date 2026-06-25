package dev.tradcode.groupctl.mixmachine.masterrc;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

public class MasterRc {
    BitwigMasterRcTracker tracker;

    public MasterRc(IEventBus bus, ControllerHost host) {
        new LaunchpadMasterRcCtl(bus);
        new TwisterMasterRcCtl(bus);
        this.tracker = new BitwigMasterRcTracker(bus, host);
    }
}
