package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

public class Logger implements IEventBusSubscriber {
    EventBus bus;
    ControllerHost host;

    public Logger(EventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.host = host;
    }

    public void on(Event event) {
        host.println(event.toString());
    }
}
