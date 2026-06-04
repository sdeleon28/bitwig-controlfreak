package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PadLongPressed;
import dev.tradcode.groupctl.events.RequestSelectGroup;
import dev.tradcode.groupctl.events.Log;

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
            case RequestSelectGroup(int id, String name) -> this.growl(event);
            case EncoderTurned(int msg, int val) -> this.growl(event);
            case EncoderButtonPressed(int n) -> this.growl(event);
            case EncoderButtonReleased(int n) -> this.growl(event);
            default -> { }
        }
    }
}
