package dev.tradcode.groupctl.palette;

import dev.tradcode.groupctl.palette.events.PaletteColorPicked;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.Log;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;

/**
 * Owns one palette page: lays 64 contiguous Launchpad colours across the grid
 * starting at {@code colorOffset}, and reports the colour under any pad pressed
 * while the page is active. Yields to other pages by ceasing to paint; the Pager
 * blanks the surface on the switch.
 */
public class PaletteCtl implements IEventBusSubscriber {
    final IEventBus bus;
    final int pageValue;
    final int colorOffset;
    boolean pageActive = false;

    public PaletteCtl(IEventBus bus, int pageValue, int colorOffset) {
        this.bus = bus;
        this.pageValue = pageValue;
        this.colorOffset = colorOffset;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive)
            return;
        for (int i = 0; i < PaletteConstants.PAGE_SIZE; i++)
            this.bus.send(new PaintPad(PaletteConstants.PADS.get(i), this.colorOffset + i));
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = n == this.pageValue;
                this.paint();
            }
            case PadClicked(int n) when this.pageActive -> {
                int i = PaletteConstants.PADS.indexOf(n);
                if (i < 0)
                    return;
                int color = this.colorOffset + i;
                this.bus.send(
                    new Log("Launchpad color: " + color),
                    new PaletteColorPicked(color)
                );
            }
            default -> { }
        }
    }
}
