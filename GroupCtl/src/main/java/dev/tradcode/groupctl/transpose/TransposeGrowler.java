package dev.tradcode.groupctl.transpose;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Growler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.RequestSetTranspose;

public class TransposeGrowler extends Growler {
    public TransposeGrowler(IEventBus bus, ControllerHost host) {
        super(bus, host);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case RequestSetTranspose(int semitones) ->
                this.growl("Transpose " + (semitones > 0 ? "+" : "") + semitones + " st");
            default -> { }
        }
    }
}
