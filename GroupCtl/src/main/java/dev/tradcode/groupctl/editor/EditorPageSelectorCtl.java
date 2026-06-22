package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.ClearEditorGridCache;
import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.RequestEditorGridRepaint;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;

/**
 * Turns the 8x8 grid into a page picker. Holding both arrows arms pager mode,
 * which lays every reachable page across the pads in reading order (page 0 top
 * left, filling rightwards then down) with the current page brightest; tapping a
 * pad jumps to that page and leaves the mode. Changing resolution briefly flashes
 * the same layout as a size indicator before the note view returns. The page
 * count is derived from {@link GridGeometry} off the same resolution and clip
 * length the pager reads, so the layout is correct whoever publishes first. The
 * grid is always restored by asking {@link EditorGridCalculator} to repaint,
 * never by blanking pads here.
 */
public class EditorPageSelectorCtl implements IEventBusSubscriber {
    static final long FLASH_MS = EditorConstants.GRID_COLS * EditorConstants.SCROLL_STEP_MS;

    IEventBus bus;
    Scheduler scheduler;
    boolean pageActive = false;
    int denominator = EditorConstants.DEFAULT_DENOMINATOR;
    double lengthBeats = EditorConstants.READ_BEATS;
    int page = 0;
    boolean mode = false;
    int generation = 0;

    public EditorPageSelectorCtl(IEventBus bus, Scheduler scheduler) {
        this.bus = bus;
        this.scheduler = scheduler;
        this.bus.subscribe(this);
    }

    private int totalPages() {
        return GridGeometry.totalPages(this.denominator, this.lengthBeats);
    }

    private int cellColor(int i, int total) {
        if (i >= total)
            return 0;
        int current = Math.min(Math.max(this.page, 0), total - 1);
        return i == current ? EditorColors.PAGE_DOT_CURRENT : EditorColors.PAGE_DOT;
    }

    private void paintOverlay() {
        int total = this.totalPages();
        for (int i = 0; i < EditorConstants.PAGE_SIZE; i++)
            this.bus.send(new PaintPad(EditorConstants.PADS.get(i), this.cellColor(i, total)));
    }

    private void restoreGrid() {
        this.bus.send(new ClearEditorGridCache(), new RequestEditorGridRepaint());
    }

    private void flash() {
        if (!this.pageActive)
            return;
        int gen = ++this.generation;
        this.paintOverlay();
        this.scheduler.schedule(() -> {
            if (gen != this.generation)
                return;
            this.restoreGrid();
        }, FLASH_MS);
    }

    public void on(Event event) {
        switch (event) {
            case EditorPageChanged(int page, int totalPages) -> {
                this.page = page;
                if (this.mode)
                    this.paintOverlay();
            }
            case EditorResolutionChanged(int denominator) -> {
                this.denominator = denominator;
                if (this.mode)
                    this.paintOverlay();
                else
                    this.flash();
            }
            case EditorClipChanged(boolean exists, double lengthBeats, var notes) -> {
                this.lengthBeats = lengthBeats;
                if (this.mode)
                    this.paintOverlay();
            }
            case EditorPagerMode(boolean active) -> {
                this.mode = active;
                this.generation++;
                if (active)
                    this.paintOverlay();
                else
                    this.restoreGrid();
            }
            case PadClicked(int n) when this.pageActive && this.mode -> {
                int i = EditorConstants.PADS.indexOf(n);
                if (i < 0 || i >= this.totalPages())
                    return;
                int delta = i - this.page;
                this.bus.send(new EditorPagerMode(false));
                if (delta != 0)
                    this.bus.send(new RequestEditorPage(delta));
            }
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                this.mode = false;
                this.generation++;
            }
            default -> { }
        }
    }
}
