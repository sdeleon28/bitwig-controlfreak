package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

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
            case BitwigTrackSelected(int id) -> this.growl(event);
            case EncoderTurned(int msg, int val) -> this.growl(event);
            case EncoderButtonPressed(int n) -> this.growl(event);
            case EncoderButtonReleased(int n) -> this.growl(event);
            default -> { }
        }
    }
}
