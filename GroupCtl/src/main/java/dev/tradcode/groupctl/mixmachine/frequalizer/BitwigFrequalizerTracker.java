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
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerParamsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ParamValue;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestSetFrequalizerParam;

/**
 * The direct-parameter boundary. It owns a cursor device that follows the native
 * selection and translates between the device's direct params and the bus. It
 * does not decide activation — {@link FrequalizerActivationCtl} does, off explicit
 * device selection.
 */
public class BitwigFrequalizerTracker implements IEventBusSubscriber {
    IEventBus bus;
    CursorTrack cursorTrack;
    CursorDevice cursorDevice;

    Map<String, Double> dirty = new HashMap<>();
    boolean dirtyFlag = false;

    public BitwigFrequalizerTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);

        this.cursorTrack = host.createCursorTrack(
            "groupctl-frequalizer-cursor", "Frequalizer Cursor", 0, 0, true);
        this.cursorDevice = this.cursorTrack.createCursorDevice();

        this.cursorDevice.addDirectParameterIdObserver(ids -> { });
        this.cursorDevice.addDirectParameterNormalizedValueObserver((id, value) -> {
            this.dirty.put(id.replace(FrequalizerParams.PREFIX, ""), value);
            this.dirtyFlag = true;
        });
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
