package dev.tradcode.groupctl.editor.animatedscroll;

import dev.tradcode.groupctl.editor.EditorConstants;
import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.RequestColumnScroll;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;

/**
 * Walks the visible column offset to an animated scroll target one column per
 * scheduled frame. Every fresh destination — animated, instant, or a fresh
 * geometry snap — and leaving the editor bump a generation counter that strands
 * the queued frames, so a superseded scroll never paints over the new view.
 */
public class AnimatedScrollCtl implements IEventBusSubscriber {
    IEventBus bus;
    Scheduler scheduler;
    int colOffset = 0;
    int generation = 0;

    public AnimatedScrollCtl(IEventBus bus, Scheduler scheduler) {
        this.bus = bus;
        this.scheduler = scheduler;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case EditorColumnOffsetChanged(int colOffset) -> this.colOffset = colOffset;
            case PageSelected(int n) -> {
                if (!Page.isEditorPage(n))
                    this.generation++;
            }
            case RequestColumnScroll(int target, boolean animate) -> {
                this.generation++;
                if (animate)
                    this.animateTo(target);
            }
            default -> { }
        }
    }

    private void animateTo(int target) {
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
                this.bus.send(new EditorColumnOffsetChanged(destination));
            }, frame * EditorConstants.SCROLL_STEP_MS);
            frame++;
            if (offset == target)
                break;
        }
    }
}
