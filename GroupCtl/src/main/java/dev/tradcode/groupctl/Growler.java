package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

public abstract class Growler implements IEventBusSubscriber {
    ControllerHost host;

    protected Growler(IEventBus bus, ControllerHost host) {
        this.host = host;
        bus.subscribe(this);
    }

    protected void growl(Object o) {
        if (this.host == null)
            return;
        this.host.showPopupNotification(o.toString());
    }
}
