package dev.tradcode.groupctl.mixmachine.masterrc;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterTempoChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.RequestSetTempo;

public class BitwigTempoTracker implements IEventBusSubscriber {
    IEventBus bus;
    Transport transport;

    public BitwigTempoTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.transport = host.createTransport();
        this.transport.tempo().value().addRawValueObserver(
            bpm -> this.bus.send(new MasterTempoChanged(bpm))
        );
    }

    public void on(Event event) {
        switch (event) {
            case RequestSetTempo(int bpm) -> this.transport.tempo().setRaw(bpm);
            default -> { }
        }
    }
}
