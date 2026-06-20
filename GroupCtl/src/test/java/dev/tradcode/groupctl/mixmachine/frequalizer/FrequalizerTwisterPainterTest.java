package dev.tradcode.groupctl.mixmachine.frequalizer;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.EncoderSlot;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerEncodersChanged;

class FrequalizerTwisterPainterTest {

    private static List<EncoderSlot> sixteen(int litEncoder, int color, int ring) {
        var slots = new ArrayList<EncoderSlot>();
        for (int i = 1; i <= 16; i++)
            slots.add(i == litEncoder ? new EncoderSlot(color, ring) : new EncoderSlot(0, 0));
        return slots;
    }

    private static int paintFor(FakeEventBus bus, int encoder) {
        return bus.events.stream()
            .filter(e -> e instanceof PaintEncoder pe && pe.n() == encoder)
            .map(e -> ((PaintEncoder) e).color())
            .reduce((a, b) -> b).orElseThrow();
    }

    private static int ringFor(FakeEventBus bus, int encoder) {
        return bus.events.stream()
            .filter(e -> e instanceof SetEncoderValue sv && sv.n() == encoder)
            .map(e -> ((SetEncoderValue) e).v())
            .reduce((a, b) -> b).orElseThrow();
    }

    @Test
    void paintsColourAndRingForEachOfTheSixteenEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerTwisterPainter(bus);

        bus.send(new FrequalizerEncodersChanged(sixteen(5, 80, 100)));

        assertEquals(16, bus.count(PaintEncoder.class));
        assertEquals(16, bus.count(SetEncoderValue.class));
        assertEquals(80, paintFor(bus, 5));
        assertEquals(100, ringFor(bus, 5));
        assertEquals(0, paintFor(bus, 1));
        assertEquals(0, ringFor(bus, 1));
    }
}
