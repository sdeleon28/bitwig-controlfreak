package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;

/**
 * Owns the editor's horizontal page: which slice of the clip's columns is on
 * screen. Paging walks the column window one column at a time so the notes
 * appear to scroll sideways, the horizontal twin of {@link EditorVerticalPager}.
 * Entering the editor, changing resolution, or reshaping the clip snaps straight
 * to the page boundary. {@link EditorGridCalculator} renders whichever column
 * offset this pager publishes.
 */
public class EditorHorizontalPager implements IEventBusSubscriber {
    IEventBus bus;
    Scheduler scheduler;
    boolean active = false;
    int denominator = EditorConstants.DEFAULT_DENOMINATOR;
    double lengthBeats = EditorConstants.READ_BEATS;
    int page = 0;
    int colOffset = 0;
    int generation = 0;

    public EditorHorizontalPager(IEventBus bus, Scheduler scheduler) {
        this.bus = bus;
        this.scheduler = scheduler;
        this.bus.subscribe(this);
    }

    private int totalPages() {
        return GridGeometry.totalPages(this.denominator, this.lengthBeats);
    }

    private int clampPage(int p) {
        return Math.min(Math.max(p, 0), this.totalPages() - 1);
    }

    private void onGeometryChanged() {
        if (!this.active)
            return;
        this.generation++; // a reshaped grid settles the view, abandoning any in-flight scroll
        this.page = this.clampPage(this.page);
        int settled = this.page * EditorConstants.GRID_COLS;
        if (this.colOffset != settled) {
            this.colOffset = settled;
            this.bus.send(new EditorColumnOffsetChanged(settled));
        }
        this.bus.send(new EditorPageChanged(this.page, this.totalPages()));
    }

    private void scrollTo(int target) {
        this.generation++;
        if (target == this.colOffset) {
            this.bus.send(new EditorColumnOffsetChanged(target));
            return;
        }
        int step = target > this.colOffset ? 1 : -1;
        int gen = this.generation;
        int frame = 1;
        for (int offset = this.colOffset + step; ; offset += step) {
            int destination = offset;
            this.scheduler.schedule(() -> {
                if (gen != this.generation)
                    return;
                this.colOffset = destination;
                this.bus.send(new EditorColumnOffsetChanged(destination));
            }, frame * EditorConstants.SCROLL_STEP_MS);
            frame++;
            if (offset == target)
                break;
        }
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.active = Page.isEditorPage(n);
                this.generation++;
                if (!this.active)
                    return;
                this.page = this.clampPage(this.page);
                this.colOffset = this.page * EditorConstants.GRID_COLS;
                this.bus.send(
                    new EditorColumnOffsetChanged(this.colOffset),
                    new EditorPageChanged(this.page, this.totalPages())
                );
            }
            case EditorResolutionChanged(int denominator) -> {
                this.denominator = denominator;
                this.onGeometryChanged();
            }
            case EditorClipChanged(boolean exists, double lengthBeats, var notes) -> {
                this.lengthBeats = lengthBeats;
                this.onGeometryChanged();
            }
            case RequestEditorPage(int delta) -> {
                if (!this.active)
                    return;
                int target = this.clampPage(this.page + delta);
                if (target == this.page)
                    return;
                this.page = target;
                this.bus.send(new EditorPageChanged(this.page, this.totalPages()));
                this.scrollTo(target * EditorConstants.GRID_COLS);
            }
            default -> { }
        }
    }
}
