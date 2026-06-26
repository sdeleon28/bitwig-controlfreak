package dev.tradcode.groupctl.mixmachine.masterrc;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Growler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcEncoderPressed;

public class MasterRcGrowler extends Growler {
    public MasterRcGrowler(IEventBus bus, ControllerHost host) {
        super(bus, host);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case MasterRcEncoderPressed e -> this.growl(e);
            default -> { }
        }
    }
}
