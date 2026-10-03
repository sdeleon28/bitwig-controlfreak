package dev.tradcode.groupctl.tones;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Growler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.tones.events.ToneSelected;

public class ToneGrowler extends Growler {
    public ToneGrowler(IEventBus bus, ControllerHost host) {
        super(bus, host);
    }

    @Override
    public void on(Event event) {
        if (event instanceof ToneSelected(String trackName))
            this.growl(trackName);
    }
}
