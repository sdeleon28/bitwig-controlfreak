package dev.tradcode.groupctl.transpose.strategies;

import java.util.List;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.transpose.MarkedDevice;
import dev.tradcode.groupctl.transpose.TransposeMarker;
import dev.tradcode.groupctl.transpose.TransposeStrategy;
import dev.tradcode.groupctl.transpose.events.RequestDeviceParamWrite;

/**
 * Bitwig's Transpose note effect.
 *
 * "Semi" spans a full eight octaves, -48..+48, so an octave of travel is only a
 * sixth of the param. Derived from three readings on a {@code {T+2}} instance:
 * 2/24 read -40, 14/24 read +8 and the top read +48.
 *
 * This is the instance that carries baselines — the keyboards are pitched up so
 * a Db-major shape sounds in C minor — but the baseline is read from the name by
 * every strategy, not just this one.
 *
 * The loosest name test of the three: "Transpose" appears in plenty of device
 * names that are not this device, so a plugin whose name contains it needs a
 * narrower test here before it can be marked.
 */
public class BitwigNoteTransposeStrategy implements TransposeStrategy {
    static final List<String> ALIASES = List.of("Semi", "Semitones");
    static final int STEPS = 96;
    static final int CONCERT_PITCH = 48;

    IEventBus bus;

    public BitwigNoteTransposeStrategy(IEventBus bus) {
        this.bus = bus;
    }

    private boolean matches(String deviceName) {
        return deviceName != null && deviceName.contains("Transpose");
    }

    public void apply(int downtune, MarkedDevice device) {
        if (!this.matches(device.name()))
            return;

        int step = CONCERT_PITCH + TransposeMarker.baselineOf(device.name()) + downtune;
        step = Math.max(0, Math.min(STEPS, step));
        this.bus.send(new RequestDeviceParamWrite(device, ALIASES, step, STEPS));
    }
}
