package dev.tradcode.groupctl.mixmachine.trackrc;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Growler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcEncoderPressed;

public class TrackRcGrowler extends Growler {
    public TrackRcGrowler(IEventBus bus, ControllerHost host) {
        super(bus, host);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case TrackRcEncoderPressed e -> this.growl(e);
            default -> { }
        }
    }
}
