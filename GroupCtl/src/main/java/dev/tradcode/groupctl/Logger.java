package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.Log;

public class Logger implements IEventBusSubscriber {
    IEventBus bus;
    ControllerHost host;

    public Logger(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.host = host;
    }

    public void on(Event event) {
        switch (event) {
            case Log(String msg) -> {
                host.println(">>> " + msg);
            }
            default -> { }
        }
    }
}
