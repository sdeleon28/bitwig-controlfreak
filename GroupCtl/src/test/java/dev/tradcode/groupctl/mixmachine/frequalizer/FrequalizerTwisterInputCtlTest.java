package dev.tradcode.groupctl.mixmachine.frequalizer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerModeChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerParamsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ParamValue;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestSetFrequalizerParam;

class FrequalizerTwisterInputCtlTest {

    private static FrequalizerTwisterInputCtl activeCtl(FakeEventBus bus, int mode) {
        var ctl = new FrequalizerTwisterInputCtl(bus);
        bus.send(new FrequalizerActivated(true));
        bus.send(new FrequalizerModeChanged(mode));
        return ctl;
    }

    private static RequestSetFrequalizerParam lastRequest(FakeEventBus bus) {
        return bus.last(RequestSetFrequalizerParam.class);
    }

    @Test
    void ignoresGesturesUntilActive() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerTwisterInputCtl(bus);

        bus.send(new EncoderTurned(1, 100));

        assertNull(lastRequest(bus));
    }

    @Test
    void aTurnWritesTheResolvedBandParam() {
        FakeEventBus bus = new FakeEventBus();
        activeCtl(bus, 0);

        bus.send(new EncoderTurned(1, 100));

        var r = lastRequest(bus);
        assertEquals(FrequalizerParams.id(2, "FREQ"), r.id());
        assertEquals(100, r.value());
        assertEquals(FrequalizerConstants.ENCODER_RANGE, r.range());
    }

    @Test
    void aTurnResolvesAgainstTheActiveMode() {
        FakeEventBus bus = new FakeEventBus();
        activeCtl(bus, 1); // Mid

        bus.send(new EncoderTurned(1, 100));

        assertEquals(FrequalizerParams.id(8, "FREQ"), lastRequest(bus).id());
    }

    @Test
    void holdingTheFreqButtonReroutesTheQualityEncoderToTheFilter() {
        FakeEventBus bus = new FakeEventBus();
        activeCtl(bus, 0);

        bus.send(new EncoderButtonPressed(1)); // hold Low's freq button
        bus.send(new EncoderTurned(5, 50));
        assertEquals(FrequalizerParams.id(2, "FILTER"), lastRequest(bus).id());

        bus.send(new EncoderButtonReleased(1));
        bus.send(new EncoderTurned(5, 50));
        assertEquals(FrequalizerParams.id(2, "QUALITY"), lastRequest(bus).id());
    }

    @Test
    void anActiveButtonTogglesFromTheLastReportedValue() {
        FakeEventBus bus = new FakeEventBus();
        activeCtl(bus, 0);

        // No reported value yet -> treated as off -> turns on.
        bus.send(new EncoderButtonPressed(9));
        assertEquals(FrequalizerParams.id(2, "ACTIVE"), lastRequest(bus).id());
        assertEquals(1, lastRequest(bus).value());
        assertEquals(FrequalizerConstants.ACTIVE_RANGE, lastRequest(bus).range());

        // Device reports it as on -> next press turns it off.
        bus.send(new FrequalizerParamsChanged(List.of(
            new ParamValue(FrequalizerParams.id(2, "ACTIVE"), 1.0))));
        bus.send(new EncoderButtonPressed(9));
        assertEquals(0, lastRequest(bus).value());
    }

    @Test
    void holdingASoloButtonSetsAndClearsBandSolo() {
        FakeEventBus bus = new FakeEventBus();
        activeCtl(bus, 0);

        bus.send(new EncoderButtonPressed(5));
        var pressed = lastRequest(bus);
        assertEquals(FrequalizerParams.BAND_SOLO, pressed.id());
        assertEquals(2, pressed.value()); // stereo Low solo step
        assertEquals(FrequalizerConstants.BAND_SOLO_RANGE, pressed.range());

        bus.send(new EncoderButtonReleased(5));
        var released = lastRequest(bus);
        assertEquals(FrequalizerParams.BAND_SOLO, released.id());
        assertEquals(0, released.value());
    }

    @Test
    void stopsRespondingAfterDeactivation() {
        FakeEventBus bus = new FakeEventBus();
        activeCtl(bus, 0);
        bus.send(new FrequalizerActivated(false));
        long before = bus.count(RequestSetFrequalizerParam.class);

        bus.send(new EncoderTurned(1, 100));

        assertEquals(before, bus.count(RequestSetFrequalizerParam.class));
    }
}
