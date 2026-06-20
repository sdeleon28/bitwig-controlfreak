package dev.tradcode.groupctl.mixmachine.frequalizer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.mixmachine.frequalizer.events.EncoderSlot;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerEncodersChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerModeChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerModePadsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerParamsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ModePadSlot;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ParamValue;

class FrequalizerCalculatorTest {

    private static FrequalizerParamsChanged params(ParamValue... values) {
        return new FrequalizerParamsChanged(List.of(values));
    }

    private static ParamValue pv(String id, double normalized) {
        return new ParamValue(id, normalized);
    }

    /** Normalized value Bitwig reports for {@code step} of a {@code range}-step param. */
    private static double step(int step, int range) {
        return (double) step / (range - 1);
    }

    // Encoder n -> slots index n-1.
    private static EncoderSlot enc(FrequalizerEncodersChanged ev, int encoder) {
        return ev.slots().get(encoder - 1);
    }

    private static int padColor(FrequalizerModePadsChanged ev, int localPad) {
        return ev.slots().stream()
            .filter(p -> p.localPad() == localPad)
            .map(ModePadSlot::color)
            .findFirst().orElseThrow();
    }

    @Test
    void staysSilentUntilActivated() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerCalculator(bus);

        bus.send(params(pv(FrequalizerParams.id(2, "ACTIVE"), 1.0)));
        assertNull(bus.last(FrequalizerEncodersChanged.class));
    }

    @Test
    void activationBroadcastsAFreshFrame() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerCalculator(bus);

        bus.send(new FrequalizerActivated(true));

        assertEquals(16, bus.last(FrequalizerEncodersChanged.class).slots().size());
        assertEquals(5, bus.last(FrequalizerModePadsChanged.class).slots().size());
        assertEquals(0, bus.last(FrequalizerModeChanged.class).mode());
    }

    @Test
    void litsAnActiveBandInItsColourWithRingsFromValues() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerCalculator(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(params(
            pv(FrequalizerParams.id(2, "ACTIVE"), 1.0),
            pv(FrequalizerParams.id(2, "FREQ"), 1.0)
        ));

        FrequalizerEncodersChanged ev = bus.last(FrequalizerEncodersChanged.class);
        assertEquals(FrequalizerColors.BAND_LOW, enc(ev, 1).color());
        assertEquals(127, enc(ev, 1).ring());
        assertEquals(FrequalizerColors.BAND_LOW, enc(ev, 5).color());
        assertEquals(FrequalizerColors.BAND_LOW, enc(ev, 9).color());
        // An untouched band stays dark.
        assertEquals(FrequalizerColors.ENCODER_OFF, enc(ev, 13).color());
    }

    @Test
    void inactiveBandIsDarkButItsRingStillTracksTheValue() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerCalculator(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(params(pv(FrequalizerParams.id(2, "FREQ"), 0.5)));

        FrequalizerEncodersChanged ev = bus.last(FrequalizerEncodersChanged.class);
        assertEquals(FrequalizerColors.ENCODER_OFF, enc(ev, 1).color());
        assertEquals(64, enc(ev, 1).ring());
    }

    @Test
    void soloDarkensEveryOtherBand() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerCalculator(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(params(
            pv(FrequalizerParams.id(2, "ACTIVE"), 1.0), // Low active
            pv(FrequalizerParams.id(3, "ACTIVE"), 1.0), // LowMids active
            pv(FrequalizerParams.BAND_SOLO, step(3, 19)) // solo step 3 -> LowMids
        ));

        FrequalizerEncodersChanged ev = bus.last(FrequalizerEncodersChanged.class);
        assertEquals(FrequalizerColors.ENCODER_OFF, enc(ev, 1).color());      // Low, darkened
        assertEquals(FrequalizerColors.BAND_LOW_MIDS, enc(ev, 2).color());    // LowMids, soloed
    }

    @Test
    void modePadsHighlightTheReportedMode() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerCalculator(bus);

        bus.send(new FrequalizerActivated(true)); // mode 0 (Stereo)
        FrequalizerModePadsChanged stereo = bus.last(FrequalizerModePadsChanged.class);
        assertEquals(FrequalizerColors.MODE_PAD_SELECTED, padColor(stereo, 9));
        assertEquals(FrequalizerColors.MODE_PAD_DESELECTED, padColor(stereo, 5));

        bus.send(params(pv(FrequalizerParams.MODE, step(3, 5)))); // MidSolo
        FrequalizerModePadsChanged midSolo = bus.last(FrequalizerModePadsChanged.class);
        assertEquals(FrequalizerColors.MODE_PAD_SELECTED, padColor(midSolo, 5)); // Mid lit by {1,3}
        assertEquals(FrequalizerColors.MODE_PAD_SELECTED, padColor(midSolo, 1)); // MidSolo lit by {3}
        assertEquals(FrequalizerColors.MODE_PAD_DESELECTED, padColor(midSolo, 9));
    }

    @Test
    void modeSwitchReTargetsTheEncodersOntoTheNewRegion() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerCalculator(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(params(
            pv(FrequalizerParams.MODE, step(1, 5)),     // Mid
            pv(FrequalizerParams.id(8, "ACTIVE"), 1.0), // mid Low active
            pv(FrequalizerParams.id(8, "FREQ"), 1.0)
        ));

        FrequalizerEncodersChanged ev = bus.last(FrequalizerEncodersChanged.class);
        assertEquals(FrequalizerColors.BAND_LOW, enc(ev, 1).color());
        assertEquals(127, enc(ev, 1).ring());
        assertEquals(1, bus.last(FrequalizerModeChanged.class).mode());
    }

    @Test
    void deactivationBlanksBothSurfaces() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerCalculator(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(params(pv(FrequalizerParams.id(2, "ACTIVE"), 1.0)));
        bus.send(new FrequalizerActivated(false));

        FrequalizerEncodersChanged ev = bus.last(FrequalizerEncodersChanged.class);
        for (EncoderSlot s : ev.slots()) {
            assertEquals(FrequalizerColors.ENCODER_OFF, s.color());
            assertEquals(0, s.ring());
        }
        for (ModePadSlot p : bus.last(FrequalizerModePadsChanged.class).slots())
            assertEquals(FrequalizerColors.MODE_PAD_OFF, p.color());
    }

    @Test
    void staysSilentAfterDeactivation() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerCalculator(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(new FrequalizerActivated(false));
        long before = bus.count(FrequalizerEncodersChanged.class);

        bus.send(params(pv(FrequalizerParams.id(2, "ACTIVE"), 1.0)));
        assertEquals(before, bus.count(FrequalizerEncodersChanged.class));
    }
}
