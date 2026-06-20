package dev.tradcode.groupctl.mixmachine.frequalizer;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerModeChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerParamsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ParamValue;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestSetFrequalizerParam;

/**
 * Translates Twister gestures into {@code RequestSetFrequalizerParam} writes.
 * It holds only transient input state — the active mode, the device-reported
 * param values, and the set of held encoder buttons — and resolves every gesture
 * against the layout. Gated on the feature being active.
 */
public class FrequalizerTwisterInputCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean active = false;
    int mode = 0;
    Map<String, Double> params = new HashMap<>();
    Set<Integer> held = new HashSet<>();

    public FrequalizerTwisterInputCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void set(String id, int value, int range) {
        if (id != null)
            this.bus.send(new RequestSetFrequalizerParam(id, value, range));
    }

    public void on(Event event) {
        switch (event) {
            case FrequalizerActivated(boolean a) -> {
                this.active = a;
                if (!a)
                    this.held.clear();
            }
            case FrequalizerModeChanged(int m) -> this.mode = m;
            case FrequalizerParamsChanged(var changed) -> {
                for (ParamValue p : changed)
                    this.params.put(p.id(), p.normalized());
            }
            case EncoderTurned(int n, int v) when this.active -> {
                int hold = FrequalizerLayout.filterHoldButton(n);
                String id = hold != -1 && this.held.contains(hold)
                    ? FrequalizerLayout.filterParam(n, this.mode)
                    : FrequalizerLayout.encoderParam(n, this.mode);
                this.set(id, v, FrequalizerConstants.ENCODER_RANGE);
            }
            case EncoderButtonPressed(int n) when this.active -> {
                this.held.add(n);
                FrequalizerBand activeBand = FrequalizerLayout.activeBandForButton(n);
                if (activeBand != null) {
                    String id = FrequalizerLayout.activeParam(activeBand, this.mode);
                    boolean on = FrequalizerDecoder.isActive(this.params.getOrDefault(id, 0.0));
                    this.set(id, on ? 0 : 1, FrequalizerConstants.ACTIVE_RANGE);
                }
                FrequalizerBand soloBand = FrequalizerLayout.soloBandForButton(n);
                if (soloBand != null)
                    this.set(FrequalizerParams.BAND_SOLO,
                        FrequalizerLayout.soloStep(soloBand, this.mode),
                        FrequalizerConstants.BAND_SOLO_RANGE);
            }
            case EncoderButtonReleased(int n) when this.active -> {
                this.held.remove(n);
                FrequalizerBand soloBand = FrequalizerLayout.soloBandForButton(n);
                if (soloBand != null)
                    this.set(FrequalizerParams.BAND_SOLO, 0, FrequalizerConstants.BAND_SOLO_RANGE);
            }
            default -> { }
        }
    }
}
