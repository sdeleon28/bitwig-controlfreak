package dev.tradcode.groupctl.transpose;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

public class Transpose {
    BitwigTransposeTracker tracker;

    public Transpose(IEventBus bus, ControllerHost host) {
        new TransposeGrowler(bus, host);
        new TransposeApplier(bus);
        this.tracker = new BitwigTransposeTracker(bus, host);
    }

    public void flush() {
        this.tracker.flush();
    }
}
