package dev.tradcode.groupctl.guitarinput;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Growler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.guitarinput.events.GuitarsArmed;

public class GuitarInputGrowler extends Growler {
    public GuitarInputGrowler(IEventBus bus, ControllerHost host) {
        super(bus, host);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case GuitarsArmed(int count) when count == 0 ->
                this.growl("No tracks under " + BitwigGuitarInputTracker.GROUP);
            case GuitarsArmed(int count) ->
                this.growl("Armed " + count + " tracks under " + BitwigGuitarInputTracker.GROUP);
            default -> { }
        }
    }
}
