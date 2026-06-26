package dev.tradcode.groupctl.mixmachine.masterrc;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.masterrc.events.RequestNudgeTempo;

public class BitwigTempoTracker implements IEventBusSubscriber {
    IEventBus bus;
    Transport transport;

    public BitwigTempoTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.transport = host.createTransport();
    }

    public void on(Event event) {
        switch (event) {
            case RequestNudgeTempo(int steps) -> this.transport.tempo().incRaw(steps);
            default -> { }
        }
    }
}
