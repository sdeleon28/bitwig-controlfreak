package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

public class Logger implements IEventBusSubscriber {
    IEventBus bus;
    ControllerHost host;

    public Logger(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.host = host;
    }

    public void on(Event event) {
        host.println(event.toString());
    }
}
