package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PadLongPressed;

public class Growler implements IEventBusSubscriber {
    IEventBus bus;
    ControllerHost host;

    public Growler(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.host = host;
    }

    private void growl(Object o) {
        this.host.showPopupNotification(o.toString());
    }

    public void on(Event event) {
        switch (event) {
            case PadClicked(int n) -> this.growl(event);
            case PadLongPressed(int n) -> this.growl(event);
            default -> { }
        }
    }
}
