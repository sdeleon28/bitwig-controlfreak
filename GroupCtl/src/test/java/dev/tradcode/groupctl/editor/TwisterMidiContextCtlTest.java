package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestSetVelocity;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;

class TwisterMidiContextCtlTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;
    private static final int OTHER = 0;
    private static final int ENC = 1; // TwisterMidiContextCtl.VELOCITY_ENCODER

    private static TwisterMidiContextCtl onEditorPage(FakeEventBus bus) {
        var ctl = new TwisterMidiContextCtl(bus);
        bus.send(new PageSelected(EDITOR));
        return ctl;
    }

    private static EditorSlot selected(int key, double startBeat, double endBeat, double velocity) {
        return new EditorSlot(true, key, startBeat, endBeat, velocity, false, true);
    }

    /** Broadcasts a grid where the given slots are selected, padding the rest unlit. */
    private static void selectInGrid(FakeEventBus bus, EditorSlot... selected) {
        List<EditorSlot> slots = new ArrayList<>();
        for (int i = 0; i < EditorConstants.PAGE_SIZE; i++)
            slots.add(i < selected.length ? selected[i] : new EditorSlot(false, 36, 0.0, 0.5));
        bus.send(new EditorGridChanged(slots, true));
    }

    private static List<RequestSetVelocity> velocityWrites(FakeEventBus bus) {
        return bus.events.stream()
            .filter(e -> e instanceof RequestSetVelocity)
            .map(e -> (RequestSetVelocity) e)
            .toList();
    }

    @Test
    void selectingASingleCellShowsItsVelocity() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);

        selectInGrid(bus, selected(36, 0.0, 0.5, 0.5));

        PaintEncoder led = bus.last(PaintEncoder.class);
        assertNotNull(led);
        assertEquals(ENC, led.n());
        assertEquals(EditorColors.VELOCITY_ENCODER_COLOR, led.color());

        SetEncoderValue ring = bus.last(SetEncoderValue.class);
        assertEquals(ENC, ring.n());
        assertEquals(64, ring.v()); // round(0.5 * 127)
    }

    @Test
    void selectingMultipleCellsDefaultsRingToFull() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);

        selectInGrid(bus, selected(36, 0.0, 0.5, 0.2), selected(36, 0.5, 1.0, 0.9));

        SetEncoderValue ring = bus.last(SetEncoderValue.class);
        assertEquals(127, ring.v()); // multiple notes -> full velocity baseline
    }

    @Test
    void turningWritesVelocityToTheSingleCell() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        selectInGrid(bus, selected(36, 0.0, 0.5, 0.5));

        bus.send(new EncoderTurned(ENC, 127));

        var writes = velocityWrites(bus);
        assertEquals(1, writes.size());
        assertEquals(36, writes.get(0).key());
        assertEquals(0.0, writes.get(0).startBeat());
        assertEquals(0.5, writes.get(0).endBeat());
        assertEquals(1.0, writes.get(0).velocity(), 1e-9);
    }

    @Test
    void turningWritesTheSameVelocityToEverySelectedCell() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        selectInGrid(bus, selected(36, 0.0, 0.5, 0.2), selected(38, 1.0, 1.5, 0.9));

        bus.send(new EncoderTurned(ENC, 64));

        var writes = velocityWrites(bus);
        assertEquals(2, writes.size());
        assertEquals(36, writes.get(0).key());
        assertEquals(0.0, writes.get(0).startBeat());
        assertEquals(38, writes.get(1).key());
        assertEquals(1.0, writes.get(1).startBeat());
        for (var w : writes)
            assertEquals(64 / 127.0, w.velocity(), 1e-9);
    }

    @Test
    void reBroadcastingTheSameSelectionDoesNotSnapTheRingBack() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        selectInGrid(bus, selected(36, 0.0, 0.5, 0.5));
        long ringWrites = bus.count(SetEncoderValue.class);

        // A playhead tick (or our own velocity round-trip) re-broadcasts the grid
        // with the same cell selected, possibly at a new velocity. The ring must
        // not be re-set or it would fight the user's turn.
        selectInGrid(bus, selected(36, 0.0, 0.5, 0.9));

        assertEquals(ringWrites, bus.count(SetEncoderValue.class));
    }

    @Test
    void ignoresTurnsOnOtherEncoders() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        selectInGrid(bus, selected(36, 0.0, 0.5, 0.5));

        bus.send(new EncoderTurned(ENC + 1, 127));

        assertEquals(0, velocityWrites(bus).size());
    }

    @Test
    void ignoresTurnsWhileNothingSelected() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);

        bus.send(new EncoderTurned(ENC, 127));

        assertEquals(0, velocityWrites(bus).size());
    }

    @Test
    void doesNotArmOffTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMidiContextCtl(bus);
        bus.send(new PageSelected(OTHER));

        selectInGrid(bus, selected(36, 0.0, 0.5, 0.5));
        bus.send(new EncoderTurned(ENC, 127));

        assertEquals(0, velocityWrites(bus).size());
    }

    @Test
    void losingTheSelectionClearsAndDisarms() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        selectInGrid(bus, selected(36, 0.0, 0.5, 0.5));

        selectInGrid(bus); // grid with nothing selected

        PaintEncoder led = bus.last(PaintEncoder.class);
        assertEquals(ENC, led.n());
        assertEquals(0, led.color());
        SetEncoderValue ring = bus.last(SetEncoderValue.class);
        assertEquals(ENC, ring.n());
        assertEquals(0, ring.v());

        bus.send(new EncoderTurned(ENC, 100));
        assertEquals(0, velocityWrites(bus).size());
    }

    @Test
    void leavingTheEditorPageDisarms() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        selectInGrid(bus, selected(36, 0.0, 0.5, 0.5));

        bus.send(new PageSelected(OTHER));
        bus.send(new EncoderTurned(ENC, 100));

        assertEquals(0, velocityWrites(bus).size());
    }

    @Test
    void enteringPagerModeDisarms() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        selectInGrid(bus, selected(36, 0.0, 0.5, 0.5));

        bus.send(new EditorPagerMode(true));
        bus.send(new EncoderTurned(ENC, 100));

        assertEquals(0, velocityWrites(bus).size());
    }
}
