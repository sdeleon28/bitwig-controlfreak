package dev.tradcode.groupctl.palette;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Growler;
import dev.tradcode.groupctl.palette.events.PaletteColorPicked;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;

public class PaletteGrowler extends Growler {
    public PaletteGrowler(IEventBus bus, ControllerHost host) {
        super(bus, host);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case PaletteColorPicked e -> this.growl(e);
            default -> { }
        }
    }
}
