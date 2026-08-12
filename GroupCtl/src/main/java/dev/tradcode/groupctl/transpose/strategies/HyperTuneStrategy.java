package dev.tradcode.groupctl.transpose.strategies;

import java.util.List;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.transpose.MarkedDevice;
import dev.tradcode.groupctl.transpose.TransposeMarker;
import dev.tradcode.groupctl.transpose.TransposeStrategy;
import dev.tradcode.groupctl.transpose.events.RequestDeviceParamWrite;

/**
 * HyperTune.
 *
 * "Transpose" only detunes: 0.0 is three octaves down and 1.0 is concert pitch,
 * so unlike every other device here 0 st sits at the top of the range rather
 * than its middle. This is what caps the global encoder at 0 st. The plugin's
 * knob is also drawn inverted against Bitwig's dial, which is cosmetic.
 *
 * Known wrong: the plugin reads high — see BUGS.md. The mapping below is the
 * straight linear one until it is re-derived from settled readings, and if the
 * device turns out not to be linear this is where a hardcoded value per semitone
 * goes.
 */
public class HyperTuneStrategy implements TransposeStrategy {
    static final List<String> ALIASES = List.of("Transpose");
    static final int STEPS = 36;
    static final int CONCERT_PITCH = 36;

    IEventBus bus;

    public HyperTuneStrategy(IEventBus bus) {
        this.bus = bus;
    }

    private boolean matches(String deviceName) {
        return deviceName != null && deviceName.contains("HyperTune");
    }

    public void apply(int downtune, MarkedDevice device) {
        if (!this.matches(device.name()))
            return;

        int step = CONCERT_PITCH + TransposeMarker.baselineOf(device.name()) + downtune;
        step = Math.max(0, Math.min(STEPS, step));
        this.bus.send(new RequestDeviceParamWrite(device, ALIASES, step, STEPS));
    }
}
