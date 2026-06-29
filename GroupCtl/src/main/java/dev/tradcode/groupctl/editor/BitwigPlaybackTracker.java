package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.PlaybackUpdate;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

public class BitwigPlaybackTracker implements IEventBusSubscriber {
    ControllerHost host;
    IEventBus bus;
    Transport transport;
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
    }

    public void on(Event event) {
    }

    public void flush() {
        if (!this.dirty)
            return;
        this.bus.send(new PlaybackUpdate(this.isPlaying));
        this.dirty = false;
    }
}
