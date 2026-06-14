package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.FxEncoderPressed;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadModeUpdated;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectDevice;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SendEncoderPressed;
import dev.tradcode.groupctl.events.TrackEncoderPressed;
import dev.tradcode.groupctl.events.VolModeSelected;

public class Growler implements IEventBusSubscriber {
    IEventBus bus;
    ControllerHost host;

    public Growler(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.host = host;
    }

    protected void growl(Object o) {
        this.host.showPopupNotification(o.toString());
    }

    public void on(Event event) {
        switch (event) {
            // selections
            case RequestSelectTrack e -> this.growl(e);
            case RequestSelectDevice e -> this.growl(e);
            case RequestFxSelectTrack e -> this.growl(e);
            // modes
            case PadModeUpdated e -> this.growl(e);
            case VolModeSelected e -> this.growl(e);
            case PanModeSelected e -> this.growl(e);
            // pages
            case PageSelected e -> this.growl(e);
            // encoder presses
            case TrackEncoderPressed e -> this.growl(e);
            case SendEncoderPressed e -> this.growl(e);
            case FxEncoderPressed e -> this.growl(e);
            default -> { }
        }
    }
}
