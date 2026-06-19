package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.RequestEndNoteContext;
import dev.tradcode.groupctl.editor.events.RequestNoteContext;
import dev.tradcode.groupctl.editor.events.RequestSetVelocity;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

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

    private static void arm(FakeEventBus bus, NoteCell... cells) {
        bus.send(new RequestNoteContext(List.of(cells)));
    }

    private static List<RequestSetVelocity> velocityWrites(FakeEventBus bus) {
        return bus.events.stream()
            .filter(e -> e instanceof RequestSetVelocity)
            .map(e -> (RequestSetVelocity) e)
            .toList();
    }

    @Test
    void armingASingleCellShowsItsVelocity() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);

        arm(bus, new NoteCell(36, 0.0, 0.5, 0.5));

        PaintEncoder led = bus.last(PaintEncoder.class);
        assertNotNull(led);
        assertEquals(ENC, led.n());
        assertEquals(EditorColors.VELOCITY_ENCODER_COLOR, led.color());

        SetEncoderValue ring = bus.last(SetEncoderValue.class);
        assertEquals(ENC, ring.n());
        assertEquals(64, ring.v()); // round(0.5 * 127)
    }

    @Test
    void armingMultipleCellsDefaultsRingToFull() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);

        arm(bus, new NoteCell(36, 0.0, 0.5, 0.2), new NoteCell(36, 0.5, 1.0, 0.9));

        SetEncoderValue ring = bus.last(SetEncoderValue.class);
        assertEquals(127, ring.v()); // multiple notes -> full velocity baseline
    }

    @Test
    void turningWritesVelocityToTheSingleCell() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        arm(bus, new NoteCell(36, 0.0, 0.5, 0.5));

        bus.send(new EncoderTurned(ENC, 127));

        var writes = velocityWrites(bus);
        assertEquals(1, writes.size());
        assertEquals(36, writes.get(0).key());
        assertEquals(0.0, writes.get(0).startBeat());
        assertEquals(0.5, writes.get(0).endBeat());
        assertEquals(1.0, writes.get(0).velocity(), 1e-9);
    }

    @Test
    void turningWritesTheSameVelocityToEveryHeldCell() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        arm(bus, new NoteCell(36, 0.0, 0.5, 0.2), new NoteCell(38, 1.0, 1.5, 0.9));

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
    void ignoresTurnsOnOtherEncoders() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        arm(bus, new NoteCell(36, 0.0, 0.5, 0.5));

        bus.send(new EncoderTurned(ENC + 1, 127));

        assertEquals(0, velocityWrites(bus).size());
    }

    @Test
    void ignoresTurnsWhileNotArmed() {
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

        arm(bus, new NoteCell(36, 0.0, 0.5, 0.5));
        bus.send(new EncoderTurned(ENC, 127));

        assertEquals(0, velocityWrites(bus).size());
    }

    @Test
    void endingTheContextClearsAndDisarms() {
        FakeEventBus bus = new FakeEventBus();
        onEditorPage(bus);
        arm(bus, new NoteCell(36, 0.0, 0.5, 0.5));

        bus.send(new RequestEndNoteContext());

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
        arm(bus, new NoteCell(36, 0.0, 0.5, 0.5));

        bus.send(new PageSelected(OTHER));
        bus.send(new EncoderTurned(ENC, 100));

        assertEquals(0, velocityWrites(bus).size());
    }
}
