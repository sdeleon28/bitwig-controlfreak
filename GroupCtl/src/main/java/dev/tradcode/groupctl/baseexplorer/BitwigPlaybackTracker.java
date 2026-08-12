package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.explorer.events.RequestSetLoop;
import dev.tradcode.groupctl.explorer.events.RequestSetMetronome;
import dev.tradcode.groupctl.explorer.events.RequestSetRecord;
import dev.tradcode.groupctl.explorer.events.RequestSetPlaybackPosition;
import dev.tradcode.groupctl.explorer.events.RequestStopPlayback;
import dev.tradcode.groupctl.explorer.events.TransportTogglesUpdate;
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
    boolean loopEnabled = false;
    boolean metronomeEnabled = false;
    boolean recordEnabled = false;
    boolean togglesDirty = false;

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
        transport.isArrangerLoopEnabled().addValueObserver(v -> {
            this.loopEnabled = v;
            this.togglesDirty = true;
        });
        transport.isMetronomeEnabled().addValueObserver(v -> {
            this.metronomeEnabled = v;
            this.togglesDirty = true;
        });
        transport.isArrangerRecordEnabled().addValueObserver(v -> {
            this.recordEnabled = v;
            this.togglesDirty = true;
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
            case RequestSetLoop(boolean enabled)
            when (transport != null) -> transport.isArrangerLoopEnabled().set(enabled);
            case RequestSetMetronome(boolean enabled)
            when (transport != null) -> transport.isMetronomeEnabled().set(enabled);
            case RequestSetRecord(boolean enabled)
            when (transport != null) -> transport.isArrangerRecordEnabled().set(enabled);
            default -> { }
        }
    }

    public void flush() {
        if (this.dirty) {
            this.bus.send(new PlaybackUpdate(this.beat, this.isPlaying));
            this.dirty = false;
        }
        if (this.togglesDirty) {
            this.bus.send(
                new TransportTogglesUpdate(
                    this.loopEnabled,
                    this.metronomeEnabled,
                    this.recordEnabled
                )
            );
            this.togglesDirty = false;
        }
    }
}
