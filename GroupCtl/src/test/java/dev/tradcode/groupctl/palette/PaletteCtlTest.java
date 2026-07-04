package dev.tradcode.groupctl.palette;

import dev.tradcode.groupctl.palette.events.PaletteColorPicked;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Log;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;

class PaletteCtlTest {

    private static final int LOW = Page.PALETTE_LOW.getValue();
    private static final int HIGH = Page.PALETTE_HIGH.getValue();
    private static final int SIZE = PaletteConstants.PAGE_SIZE;

    private static int padAt(int i) {
        return PaletteConstants.PADS.get(i);
    }

    /** Latest colour pushed to {@code padNote}, or -1 if untouched. */
    private static int colorOf(FakeEventBus bus, int padNote) {
        for (int j = bus.events.size() - 1; j >= 0; j--)
            if (bus.events.get(j) instanceof PaintPad p && p.n() == padNote)
                return p.color();
        return -1;
    }

    @Test
    void paintsEverySwatchWhenItsPageBecomesActive() {
        FakeEventBus bus = new FakeEventBus();
        new PaletteCtl(bus, LOW, 0);

        bus.send(new PageSelected(LOW));

        assertEquals(SIZE, bus.count(PaintPad.class));
        assertEquals(0, colorOf(bus, padAt(0)));        // colour 0 on the top-left pad
        assertEquals(SIZE - 1, colorOf(bus, padAt(SIZE - 1))); // colour 63 bottom-right
    }

    @Test
    void theHighPageOffsetsItsColours() {
        FakeEventBus bus = new FakeEventBus();
        new PaletteCtl(bus, HIGH, SIZE);

        bus.send(new PageSelected(HIGH));

        assertEquals(SIZE, bus.count(PaintPad.class));
        assertEquals(SIZE, colorOf(bus, padAt(0)));           // colour 64
        assertEquals(2 * SIZE - 1, colorOf(bus, padAt(SIZE - 1))); // colour 127
    }

    @Test
    void pressingASwatchLogsAndAnnouncesItsColour() {
        FakeEventBus bus = new FakeEventBus();
        new PaletteCtl(bus, LOW, 0);
        bus.send(new PageSelected(LOW));

        bus.send(new PadClicked(padAt(5)));

        assertEquals("Launchpad color: 5", bus.last(Log.class).message());
        assertEquals(5, bus.last(PaletteColorPicked.class).color());
    }

    @Test
    void theHighPageReportsTheOffsetColour() {
        FakeEventBus bus = new FakeEventBus();
        new PaletteCtl(bus, HIGH, SIZE);
        bus.send(new PageSelected(HIGH));

        bus.send(new PadClicked(padAt(2)));

        assertEquals(SIZE + 2, bus.last(PaletteColorPicked.class).color());
    }

    @Test
    void staysSilentWhileItsPageIsInactive() {
        FakeEventBus bus = new FakeEventBus();
        new PaletteCtl(bus, LOW, 0);

        bus.send(new PageSelected(Page.GROUPCTL.getValue())); // some other page
        assertEquals(0, bus.count(PaintPad.class));

        bus.send(new PadClicked(padAt(0)));
        assertNull(bus.last(Log.class));
        assertNull(bus.last(PaletteColorPicked.class));
    }

    @Test
    void stopsPaintingOncePagedAway() {
        FakeEventBus bus = new FakeEventBus();
        new PaletteCtl(bus, LOW, 0);
        bus.send(new PageSelected(LOW));
        long painted = bus.count(PaintPad.class);

        bus.send(new PageSelected(HIGH)); // a different page takes over
        assertEquals(painted, bus.count(PaintPad.class));

        bus.send(new PadClicked(padAt(0))); // taps no longer report
        assertNull(bus.last(PaletteColorPicked.class));
    }

    @Test
    void ignoresPadsOutsideTheGrid() {
        FakeEventBus bus = new FakeEventBus();
        new PaletteCtl(bus, LOW, 0);
        bus.send(new PageSelected(LOW));

        bus.send(new PadClicked(99)); // not a real pad note

        assertNull(bus.last(PaletteColorPicked.class));
        assertNull(bus.last(Log.class));
    }
}
