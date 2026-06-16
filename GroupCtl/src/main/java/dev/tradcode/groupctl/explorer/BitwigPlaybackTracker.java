package dev.tradcode.groupctl.explorer;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PlaybackPositionChanged;
import dev.tradcode.groupctl.events.RequestSetPlaybackPosition;

/**
 * Owns playback position: handles {@link RequestSetPlaybackPosition} by jumping
 * the transport, and broadcasts {@link PlaybackPositionChanged} on the flush
 * cycle (coalescing the high-frequency play-position observer).
 */
public class BitwigPlaybackTracker implements IEventBusSubscriber {
    ControllerHost host;
    IEventBus bus;
    Transport transport;
    double beat = 0;
    boolean dirty = false;

    protected BitwigPlaybackTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.host = host;
        this.bus.subscribe(this);
        // escape hatch for testing without major refactor
        if (host == null)
            return;
        this.transport = host.createTransport();
        transport.playPosition().addValueObserver(v -> {
            this.beat = v;
            this.dirty = true;
        });
    }

    public void on(Event event) {
        switch (event) {
            case RequestSetPlaybackPosition(double b) -> {
                if (transport != null) {
                    transport.playStartPosition().set(b);
                    transport.jumpToPlayStartPosition();
                }
            }
            default -> { }
        }
    }

    public void flush() {
        if (!this.dirty)
            return;
        this.bus.send(new PlaybackPositionChanged(this.beat));
        this.dirty = false;
    }
}
