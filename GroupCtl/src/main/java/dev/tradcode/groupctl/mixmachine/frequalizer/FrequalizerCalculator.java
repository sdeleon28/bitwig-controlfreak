package dev.tradcode.groupctl.mixmachine.frequalizer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.EncoderSlot;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerEncodersChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerModeChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerModePadsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ModePadSlot;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ParamValue;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerParamsChanged;

/**
 * The reducer and single owner of the feature's decoded visual state. It caches
 * the device's direct-param values and, while active, decodes them into the
 * encoder and mode-pad frames the painters consume. It never paints.
 */
public class FrequalizerCalculator implements IEventBusSubscriber {
    static final int ENCODER_COUNT = 16;

    IEventBus bus;
    boolean active = false;
    Map<String, Double> params = new HashMap<>();

    public FrequalizerCalculator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private double value(String id) {
        return this.params.getOrDefault(id, 0.0);
    }

    private void recompute() {
        if (!this.active)
            return;

        int mode = FrequalizerDecoder.mode(value(FrequalizerParams.MODE));
        FrequalizerBand solo = FrequalizerDecoder.soloedBand(value(FrequalizerParams.BAND_SOLO));

        EncoderSlot[] slots = new EncoderSlot[ENCODER_COUNT];
        for (int i = 0; i < ENCODER_COUNT; i++)
            slots[i] = new EncoderSlot(FrequalizerColors.ENCODER_OFF, 0);

        for (var band : FrequalizerLayout.bandsForMode(mode)) {
            boolean activeBand = FrequalizerDecoder.isActive(value(band.activeParamId()));
            boolean lit = solo != null ? band.band() == solo : activeBand;
            int color = lit ? band.color() : FrequalizerColors.ENCODER_OFF;
            for (var ep : band.encoderParams()) {
                int ring = FrequalizerDecoder.ring(value(ep.paramId()));
                slots[ep.encoder() - 1] = new EncoderSlot(color, ring);
            }
        }

        var pads = new ArrayList<ModePadSlot>();
        for (var pad : FrequalizerLayout.modePads()) {
            int color = pad.selectedWhen().contains(mode)
                ? FrequalizerColors.MODE_PAD_SELECTED
                : FrequalizerColors.MODE_PAD_DESELECTED;
            pads.add(new ModePadSlot(pad.localPad(), color));
        }

        this.bus.send(
            new FrequalizerEncodersChanged(List.of(slots)),
            new FrequalizerModePadsChanged(pads),
            new FrequalizerModeChanged(mode)
        );
    }

    private void broadcastCleared() {
        EncoderSlot[] slots = new EncoderSlot[ENCODER_COUNT];
        for (int i = 0; i < ENCODER_COUNT; i++)
            slots[i] = new EncoderSlot(FrequalizerColors.ENCODER_OFF, 0);

        var pads = new ArrayList<ModePadSlot>();
        for (var pad : FrequalizerLayout.modePads())
            pads.add(new ModePadSlot(pad.localPad(), FrequalizerColors.MODE_PAD_OFF));

        this.bus.send(
            new FrequalizerEncodersChanged(List.of(slots)),
            new FrequalizerModePadsChanged(pads)
        );
    }

    public void on(Event event) {
        switch (event) {
            case FrequalizerActivated(boolean a) -> {
                this.active = a;
                if (a)
                    this.recompute();
                else
                    this.broadcastCleared();
            }
            case FrequalizerParamsChanged(var changed) -> {
                for (ParamValue p : changed)
                    this.params.put(p.id(), p.normalized());
                this.recompute();
            }
            default -> { }
        }
    }
}
