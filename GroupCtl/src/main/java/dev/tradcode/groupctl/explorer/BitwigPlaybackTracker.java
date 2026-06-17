package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.explorer.events.RequestSetPlaybackPosition;
import dev.tradcode.groupctl.explorer.events.RequestStopPlayback;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

public class BitwigPlaybackTracker implements IEventBusSubscriber {
    ControllerHost host;
    IEventBus bus;
    Transport transport;
    double beat = 0;
    boolean isPlaying;
    boolean dirty = false;

    protected BitwigPlaybackTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.host = host;
        this.bus.subscribe(this);
        // escape hatch for testing without major refactor
        if (host == null)
            return;
        this.transport = host.createTransport();
        transport.isPlaying().addValueObserver(v -> {
            this.isPlaying = v;
            this.dirty = true;
        });
        transport.playPosition().addValueObserver(v -> {
            this.beat = v;
            this.dirty = true;
        });
    }

    public void on(Event event) {
        switch (event) {
            case RequestSetPlaybackPosition(double b)
            when (transport != null) -> {
                transport.playStartPosition().set(b);
                transport.jumpToPlayStartPosition();
            }
            case RequestStopPlayback()
            when (transport != null) -> transport.stop();
            default -> { }
        }
    }

    public void flush() {
        if (!this.dirty)
            return;
        this.bus.send(new PlaybackUpdate(this.beat, this.isPlaying));
        this.dirty = false;
    }
}
