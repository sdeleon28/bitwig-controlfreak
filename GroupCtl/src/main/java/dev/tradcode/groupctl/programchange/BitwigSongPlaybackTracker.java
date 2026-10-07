package dev.tradcode.groupctl.programchange;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.programchange.events.RequestPlayFrom;

public class BitwigSongPlaybackTracker implements IEventBusSubscriber {
    Transport transport;

    public BitwigSongPlaybackTracker(IEventBus bus, ControllerHost host) {
        this.transport = host.createTransport();
        bus.subscribe(this);
    }

    public void on(Event event) {
        if (event instanceof RequestPlayFrom(double beat)) {
            transport.playStartPosition().set(beat);
            transport.setPosition(beat);
            transport.play();
        }
    }
}
