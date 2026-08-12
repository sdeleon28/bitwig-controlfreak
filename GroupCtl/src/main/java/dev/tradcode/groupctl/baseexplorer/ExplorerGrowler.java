package dev.tradcode.groupctl.explorer;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Growler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.ResolutionChanged;
import dev.tradcode.groupctl.explorer.events.RequestSetLoop;
import dev.tradcode.groupctl.explorer.events.RequestSetMetronome;
import dev.tradcode.groupctl.explorer.events.RequestSetRecord;

public class ExplorerGrowler extends Growler {
    public ExplorerGrowler(IEventBus bus, ControllerHost host) {
        super(bus, host);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case ResolutionChanged e -> this.growl(e);
            case RequestSetLoop e -> this.growl(e);
            case RequestSetMetronome e -> this.growl(e);
            case RequestSetRecord e -> this.growl(e);
            default -> { }
        }
    }
}
