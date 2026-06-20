package dev.tradcode.groupctl.mixmachine.frequalizer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorDevice;
import com.bitwig.extension.controller.api.CursorTrack;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerParamsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ParamValue;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestSetFrequalizerParam;

public class BitwigFrequalizerTracker implements IEventBusSubscriber {
    IEventBus bus;
    CursorTrack cursorTrack;
    CursorDevice cursorDevice;

    String deviceName = "";
    boolean deviceExists = false;
    boolean active = false;

    Map<String, Double> dirty = new HashMap<>();
    boolean dirtyFlag = false;

    public BitwigFrequalizerTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);

        this.cursorTrack = host.createCursorTrack(
            "groupctl-frequalizer-cursor", "Frequalizer Cursor", 0, 0, true);
        this.cursorDevice = this.cursorTrack.createCursorDevice();

        this.cursorDevice.name().markInterested();
        this.cursorDevice.exists().markInterested();
        this.cursorDevice.name().addValueObserver(name -> {
            this.deviceName = name;
            this.updateActivation();
        });
        this.cursorDevice.exists().addValueObserver(exists -> {
            this.deviceExists = exists;
            this.updateActivation();
        });

        this.cursorDevice.addDirectParameterIdObserver(ids -> { });
        this.cursorDevice.addDirectParameterNormalizedValueObserver((id, value) -> {
            this.dirty.put(id.replace(FrequalizerParams.PREFIX, ""), value);
            this.dirtyFlag = true;
        });
    }

    private void updateActivation() {
        boolean shouldBeActive =
            this.deviceExists && FrequalizerConstants.DEVICE_NAME.equals(this.deviceName);
        if (shouldBeActive == this.active)
            return;
        this.active = shouldBeActive;
        this.bus.send(new FrequalizerActivated(shouldBeActive));
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
            default -> { }
        }
    }
}
