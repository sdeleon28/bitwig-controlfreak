package dev.tradcode.groupctl.transpose;

import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.RequestSetTranspose;
import dev.tradcode.groupctl.transpose.events.MarkedDevicesChanged;

/**
 * Offers every marked device to every strategy. Which of them recognises it is
 * the strategy's own business, so nothing here knows one device from another.
 */
public class TransposeApplier implements IEventBusSubscriber {
    List<TransposeStrategy> strategies;
    List<MarkedDevice> devices = List.of();
    // Nothing is written until the encoder is actually moved: on startup we have
    // no idea what the plugins are set to, and forcing them to our notion of
    // zero would silently overwrite whatever was saved with the project.
    boolean engaged = false;
    int downtune = 0;

    public TransposeApplier(IEventBus bus) {
        this(bus, TransposeStrategies.all(bus));
    }

    public TransposeApplier(IEventBus bus, List<TransposeStrategy> strategies) {
        this.strategies = strategies;
        bus.subscribe(this);
    }

    private void apply() {
        for (var device : this.devices)
            for (var strategy : this.strategies)
                strategy.apply(this.downtune, device);
    }

    public void on(Event event) {
        switch (event) {
            case RequestSetTranspose(int semitones) -> {
                this.downtune = semitones;
                this.engaged = true;
                this.apply();
            }
            case MarkedDevicesChanged(List<MarkedDevice> devices) -> {
                this.devices = devices;
                if (this.engaged)
                    this.apply();
            }
            default -> { }
        }
    }
}
