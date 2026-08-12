package dev.tradcode.groupctl.transpose.strategies;

import java.util.List;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.transpose.MarkedDevice;
import dev.tradcode.groupctl.transpose.TransposeMarker;
import dev.tradcode.groupctl.transpose.TransposeStrategy;
import dev.tradcode.groupctl.transpose.events.RequestDeviceParamWrite;

/**
 * Archetype: Gojira X.
 *
 * "Transpose" runs -12..+12 in whole semitones across the param's 0..1 range, so
 * concert pitch is the midpoint and one semitone is 1/24. Measured: 0.0 reads
 * -12 st, 1.0 reads +12 st, and one step above centre is 0.5416666865348816.
 */
public class GojiraStrategy implements TransposeStrategy {
    static final List<String> ALIASES = List.of("Transpose");
    static final int STEPS = 24;
    static final int CONCERT_PITCH = 12;

    IEventBus bus;

    public GojiraStrategy(IEventBus bus) {
        this.bus = bus;
    }

    private boolean matches(String deviceName) {
        return deviceName != null && deviceName.contains("Gojira");
    }

    public void apply(int downtune, MarkedDevice device) {
        if (!this.matches(device.name()))
            return;

        int step = CONCERT_PITCH + TransposeMarker.baselineOf(device.name()) + downtune;
        step = Math.max(0, Math.min(STEPS, step));
        this.bus.send(new RequestDeviceParamWrite(device, ALIASES, step, STEPS));
    }
}
