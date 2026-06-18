package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PaintPad;

class EditorGridPainterTest {

    private static EditorSlot unlit() {
        return new EditorSlot(false, 36, 0, 0.5);
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
    void paintsAllSixtyFourPads() {
        FakeEventBus bus = new FakeEventBus();
        new EditorGridPainter(bus);

        bus.send(new EditorGridChanged(grid(Map.of()), true));
        assertEquals(64, bus.count(PaintPad.class));
    }
}
