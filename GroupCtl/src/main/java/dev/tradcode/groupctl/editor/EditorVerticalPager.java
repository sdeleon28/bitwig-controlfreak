package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorKeyOffsetChanged;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;

/**
 * Maps the editor's two global pages onto vertical windows of the key range and
 * scrolls between them. Entering the editor from elsewhere snaps straight to the
 * page's window; moving between the two editor pages walks the window one row at
 * a time so the notes appear to scroll. {@link EditorGridCalculator} renders
 * whichever offset this pager publishes.
 */
public class EditorVerticalPager implements IEventBusSubscriber {
    static final long STEP_MS = 22;

    IEventBus bus;
    Scheduler scheduler;
    boolean active = false;
    int currentOffset = 0;
    int generation = 0;

    public EditorVerticalPager(IEventBus bus, Scheduler scheduler) {
        this.bus = bus;
        this.scheduler = scheduler;
        this.bus.subscribe(this);
    }

    private static int offsetForPage(int n) {
        return n == EditorConstants.PAGE_INDEX ? EditorConstants.MAX_KEY_OFFSET : 0;
    }

    private void snapTo(int offset) {
        this.currentOffset = offset;
        this.bus.send(new EditorKeyOffsetChanged(offset));
    }

    private void scrollTo(int target) {
        int step = target > this.currentOffset ? 1 : -1;
        int gen = this.generation;
        int frame = 1;
        for (int offset = this.currentOffset + step; ; offset += step) {
            int destination = offset;
            this.scheduler.schedule(() -> {
                if (gen != this.generation)
                    return;
                this.currentOffset = destination;
                this.bus.send(new EditorKeyOffsetChanged(destination));
            }, frame * STEP_MS);
            frame++;
            if (offset == target)
                break;
        }
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                boolean wasActive = this.active;
                this.active = Page.isEditorPage(n);
                this.generation++;
                if (!this.active)
                    return;
                int target = offsetForPage(n);
                if (!wasActive || target == this.currentOffset)
                    this.snapTo(target);
                else
                    this.scrollTo(target);
            }
            default -> { }
        }
    }
}
