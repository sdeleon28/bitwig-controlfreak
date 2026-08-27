package dev.tradcode.groupctl.mixmachine.frequalizer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorTrack;
import com.bitwig.extension.controller.api.PinnableCursorDevice;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerDeviceEnabledChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerGrabbed;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerParamsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ParamValue;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestSetFrequalizerParam;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestToggleFrequalizerDevice;

/**
 * The direct-parameter boundary. It owns a cursor device pinned to the grabbed
 * plugin instance and translates between that device's direct params and the
 * bus, so browsing other devices in Bitwig's UI does not steal the surface. It
 * does not decide activation — {@link FrequalizerActivationCtl} does, off explicit
 * device selection.
 */
public class BitwigFrequalizerTracker implements IEventBusSubscriber {
    static final int PIN_DELAY_MS = 200;

    IEventBus bus;
    ControllerHost host;
    CursorTrack cursorTrack;
    PinnableCursorDevice cursorDevice;

    Map<String, Double> dirty = new HashMap<>();
    boolean dirtyFlag = false;

    public BitwigFrequalizerTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.host = host;
        this.bus.subscribe(this);

        this.cursorTrack = host.createCursorTrack(
            "groupctl-frequalizer-cursor", "Frequalizer Cursor", 0, 0, true);
        this.cursorDevice = this.cursorTrack.createCursorDevice();

        this.cursorDevice.isPinned().markInterested();
        this.cursorDevice.isEnabled().markInterested();
        this.cursorDevice.isEnabled().addValueObserver(
            v -> this.bus.send(new FrequalizerDeviceEnabledChanged(v)));

        this.cursorDevice.addDirectParameterIdObserver(ids -> { });
        this.cursorDevice.addDirectParameterNormalizedValueObserver((id, value) -> {
            this.dirty.put(id.replace(FrequalizerParams.PREFIX, ""), value);
            this.dirtyFlag = true;
        });
    }

    private void pinToGrabbedDevice() {
        this.cursorDevice.isPinned().set(false);
        this.host.scheduleTask(() -> this.cursorDevice.isPinned().set(true), PIN_DELAY_MS);
    }

    public void flush() {
        if (!this.dirtyFlag)
            return;
        var changed = new ArrayList<ParamValue>();
        this.dirty.forEach((id, value) -> changed.add(new ParamValue(id, value)));
        this.dirty.clear();
        this.dirtyFlag = false;
        this.bus.send(new FrequalizerParamsChanged(changed));
    }

    public void on(Event event) {
        switch (event) {
            case RequestSetFrequalizerParam(String id, int value, int range) ->
                this.cursorDevice.setDirectParameterValueNormalized(id, value, range);
            case RequestToggleFrequalizerDevice() -> this.cursorDevice.isEnabled().toggle();
            case FrequalizerGrabbed() -> this.pinToGrabbedDevice();
            case FrequalizerActivated(boolean active) when !active ->
                this.cursorDevice.isPinned().set(false);
            default -> { }
        }
    }
}
