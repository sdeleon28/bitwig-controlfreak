package dev.tradcode.groupctl.mixmachine.frequalizer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerModePadsChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.ModePadSlot;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestSetFrequalizerParam;

class FrequalizerModeCtlTest {

    // Mode pads live in the top-right quadrant (origin note 55):
    // local 9 -> 75 (Stereo), local 5 -> 65 (Mid), local 1 -> 55 (MidSolo).
    private static final int STEREO_PAD = 75;
    private static final int MID_PAD = 65;
    private static final int MIDSOLO_PAD = 55;

    private static int paintFor(FakeEventBus bus, int note) {
        return bus.events.stream()
            .filter(e -> e instanceof PaintPad pp && pp.n() == note)
            .map(e -> ((PaintPad) e).color())
            .reduce((a, b) -> b).orElseThrow();
    }

    @Test
    void paintsModePadsAtTheirQuadrantLocalNotes() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerModeCtl(bus);

        bus.send(new FrequalizerModePadsChanged(List.of(
            new ModePadSlot(9, 21),
            new ModePadSlot(5, 1)
        )));

        assertEquals(21, paintFor(bus, STEREO_PAD));
        assertEquals(1, paintFor(bus, MID_PAD));
    }

    @Test
    void aClickSelectsTheModeWhenActive() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerModeCtl(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(new PadClicked(STEREO_PAD));
        bus.send(new PadClicked(MID_PAD));
        bus.send(new PadClicked(MIDSOLO_PAD));

        var requests = bus.events.stream()
            .filter(e -> e instanceof RequestSetFrequalizerParam)
            .map(e -> (RequestSetFrequalizerParam) e)
            .toList();
        assertEquals(3, requests.size());
        requests.forEach(r -> {
            assertEquals(FrequalizerParams.MODE, r.id());
            assertEquals(FrequalizerConstants.MODE_RANGE, r.range());
        });
        assertEquals(0, requests.get(0).value()); // Stereo
        assertEquals(1, requests.get(1).value()); // Mid
        assertEquals(3, requests.get(2).value()); // MidSolo
    }

    @Test
    void ignoresClicksWhenInactive() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerModeCtl(bus);

        bus.send(new PadClicked(STEREO_PAD));

        assertNull(bus.last(RequestSetFrequalizerParam.class));
    }

    @Test
    void ignoresClicksOnPadsThatAreNotModePads() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerModeCtl(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(new PadClicked(57)); // quadrant-local 3 — not a mode pad
        bus.send(new PadClicked(11)); // outside the quadrant entirely

        assertNull(bus.last(RequestSetFrequalizerParam.class));
    }

    @Test
    void doesNotPaintWhenNotOnTheFirstPage() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerModeCtl(bus);

        bus.send(new PageSelected(1));
        bus.send(new FrequalizerModePadsChanged(List.of(new ModePadSlot(9, 21))));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof PaintPad));
    }

    @Test
    void repaintsCachedPadsWhenReturningToTheFirstPageWhileActive() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerModeCtl(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(new FrequalizerModePadsChanged(List.of(new ModePadSlot(9, 21))));
        bus.send(new PageSelected(1));
        bus.clear();

        bus.send(new PageSelected(0));

        assertEquals(21, paintFor(bus, STEREO_PAD));
    }

    @Test
    void doesNotRepaintWhenReturningToTheFirstPageWhileInactive() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerModeCtl(bus);

        bus.send(new FrequalizerModePadsChanged(List.of(new ModePadSlot(9, 21))));
        bus.send(new PageSelected(1));
        bus.clear();

        bus.send(new PageSelected(0));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof PaintPad));
    }

    @Test
    void ignoresClicksWhenNotOnTheFirstPage() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerModeCtl(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(new PageSelected(1));
        bus.send(new PadClicked(STEREO_PAD));

        assertNull(bus.last(RequestSetFrequalizerParam.class));
    }
}
