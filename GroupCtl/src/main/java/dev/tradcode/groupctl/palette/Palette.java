package dev.tradcode.groupctl.palette;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.IEventBus;

/**
 * Reference pages at the end of the page list that lay the Launchpad's 128
 * colours across the grid (0..63, then 64..127); pressing a swatch logs its
 * colour number and pops it up. Self-contained: deleting the one line that
 * constructs this in {@code GroupCtlExtension} removes the feature (the empty
 * {@code PALETTE_*} entries in {@link Page} can then be dropped too).
 */
public class Palette {
    public Palette(IEventBus bus, ControllerHost host) {
        new PaletteCtl(bus, Page.PALETTE_LOW.getValue(), 0);
        new PaletteCtl(bus, Page.PALETTE_HIGH.getValue(), PaletteConstants.PAGE_SIZE);
        new PaletteGrowler(bus, host);
    }
}
