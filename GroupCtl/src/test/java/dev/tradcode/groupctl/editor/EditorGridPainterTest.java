package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.ClearEditorGridCache;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.ClearLaunchpad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PaintPad;

class EditorGridPainterTest {

    private static EditorSlot unlit() {
        return new EditorSlot(false, 36, 0, 0.5);
    }

    private static EditorSlot playing(boolean lit) {
        return new EditorSlot(lit, 36, 0, 0.5, lit ? 1.0 : 0.0, true);
    }

    private static List<EditorSlot> grid(Map<Integer, EditorSlot> overrides) {
        List<EditorSlot> slots = new ArrayList<>();
        for (int i = 0; i < EditorConstants.PAGE_SIZE; i++)
            slots.add(overrides.getOrDefault(i, unlit()));
        return slots;
    }

    private static int lastPaintPad(FakeEventBus bus, int note) {
        int color = -1;
        for (Event e : bus.events)
            if (e instanceof PaintPad p && p.n() == note)
                color = p.color();
        return color;
    }

    @Test
    void paintsLitPadsWithTheNoteColorAndTheRestOff() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridPainter(bus);

        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0, 0.5),
            5, new EditorSlot(true, 36, 2.5, 3.0)
        )), true));

        assertEquals(EditorColors.NOTE, lastPaintPad(bus, EditorConstants.PADS.get(0)));
        assertEquals(EditorColors.NOTE, lastPaintPad(bus, EditorConstants.PADS.get(5)));
        assertEquals(0, lastPaintPad(bus, EditorConstants.PADS.get(1)));
    }

    @Test
    void paintsSelectedPadsRedEvenUnderThePlayhead() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridPainter(bus);

        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0, 0.5, 0.6, false, true), // selected
            8, new EditorSlot(true, 36, 0, 0.5, 0.6, true, true)   // selected + playing
        )), true));

        assertEquals(EditorColors.ACTIVE_CONTEXT, lastPaintPad(bus, EditorConstants.PADS.get(0)));
        assertEquals(EditorColors.ACTIVE_CONTEXT, lastPaintPad(bus, EditorConstants.PADS.get(8)));
    }

    @Test
    void paintsAllSixtyFourPads() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridPainter(bus);

        bus.send(new EditorGridChanged(grid(Map.of()), true));
        assertEquals(64, bus.count(PaintPad.class));
    }

    @Test
    void paintsThePlayheadColumnDistinctly() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridPainter(bus);

        bus.send(new EditorGridChanged(grid(Map.of(
            0, playing(true),    // a note struck under the cursor
            8, playing(false)    // an empty cell swept by the cursor
        )), true));

        assertEquals(EditorColors.PLAYHEAD_NOTE, lastPaintPad(bus, EditorConstants.PADS.get(0)));
        assertEquals(EditorColors.PLAYHEAD, lastPaintPad(bus, EditorConstants.PADS.get(8)));
    }

    @Test
    void onlyRepaintsPadsWhoseColorChanged() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridPainter(bus);

        bus.send(new EditorGridChanged(grid(Map.of(0, new EditorSlot(true, 36, 0, 0.5))), true));
        long afterFirst = bus.count(PaintPad.class);

        // Only pad 1 changes (becomes the playhead); the other 63 stay put.
        bus.send(new EditorGridChanged(grid(Map.of(
            0, new EditorSlot(true, 36, 0, 0.5),
            1, playing(false)
        )), true));

        assertEquals(afterFirst + 1, bus.count(PaintPad.class));
    }

    @Test
    void repaintsEverythingAfterAClear() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridPainter(bus);

        bus.send(new EditorGridChanged(grid(Map.of()), true));
        long afterFirst = bus.count(PaintPad.class);

        bus.send(new ClearLaunchpad());
        bus.send(new EditorGridChanged(grid(Map.of()), true));

        assertEquals(afterFirst + 64, bus.count(PaintPad.class));
    }

    @Test
    void clearingTheCacheForcesAFullRepaintEvenWhenTheGridIsUnchanged() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridPainter(bus);

        bus.send(new EditorGridChanged(grid(Map.of()), true));
        long afterFirst = bus.count(PaintPad.class);

        // The page picker overlay painted these pads behind the painter's back,
        // so a stale cache would dedup the restore away; clearing it must not.
        bus.send(new ClearEditorGridCache());
        bus.send(new EditorGridChanged(grid(Map.of()), true));

        assertEquals(afterFirst + 64, bus.count(PaintPad.class));
    }
}
