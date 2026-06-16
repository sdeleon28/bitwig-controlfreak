package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.BitwigSelectionChanged;
import dev.tradcode.groupctl.explorer.events.RequestClearSelection;
import dev.tradcode.groupctl.explorer.events.RequestSetSelection;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

/**
 * Owns the arranger time selection (expressed as the arranger loop range).
 * Handles set/clear requests and broadcasts {@link BitwigSelectionChanged} on the
 * flush cycle.
 */
public class BitwigSelectionTracker implements IEventBusSubscriber {
    ControllerHost host;
    IEventBus bus;
    Transport transport;
    double start = 0;
    double duration = 0;
    boolean dirty = false;

    protected BitwigSelectionTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.host = host;
        this.bus.subscribe(this);
        // escape hatch for testing without major refactor
        if (host == null)
            return;
        this.transport = host.createTransport();
        transport.arrangerLoopStart().addValueObserver(v -> {
            this.start = v;
            this.dirty = true;
        });
        transport.arrangerLoopDuration().addValueObserver(v -> {
            this.duration = v;
            this.dirty = true;
        });
    }

    public void on(Event event) {
        switch (event) {
            case RequestSetSelection(double s, double e) -> {
                if (transport != null) {
                    transport.arrangerLoopStart().set(s);
                    transport.arrangerLoopDuration().set(e - s);
                }
            }
            case RequestClearSelection() -> {
                if (transport != null)
                    transport.arrangerLoopDuration().set(0);
            }
            default -> { }
        }
    }

    public void flush() {
        if (!this.dirty)
            return;
        this.bus.send(new BitwigSelectionChanged(this.start, this.duration));
        this.dirty = false;
    }
}
