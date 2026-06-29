package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.RequestColumnScroll;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;

/**
 * Owns the editor's horizontal page: which slice of the clip's columns is on
 * screen, the horizontal twin of {@link EditorVerticalPager}. It tracks only the
 * logical page; the visible column motion that gets there is rendered by a
 * scroller package keyed off the {@code animate} flag (animated for button
 * paging, instant for snaps and playhead following). Entering the editor,
 * changing resolution, or reshaping the clip snaps straight to the page
 * boundary. {@link EditorGridCalculator} renders whichever column offset the
 * scroller publishes.
 */
public class EditorHorizontalPager implements IEventBusSubscriber {
    IEventBus bus;
    boolean active = false;
    int denominator = EditorConstants.DEFAULT_DENOMINATOR;
    double lengthBeats = EditorConstants.READ_BEATS;
    int page = 0;

    public EditorHorizontalPager(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private int totalPages() {
        return GridGeometry.totalPages(this.denominator, this.lengthBeats);
    }

    private int clampPage(int p) {
        return Math.min(Math.max(p, 0), this.totalPages() - 1);
    }

    private void settle(boolean animate) {
        this.bus.send(
            new EditorPageChanged(this.page, this.totalPages()),
            new RequestColumnScroll(this.page * EditorConstants.GRID_COLS, animate)
        );
    }

    private void onGeometryChanged() {
        if (!this.active)
            return;
        this.page = this.clampPage(this.page); // a reshaped grid settles the view onto a valid page
        this.settle(false);
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.active = Page.isEditorPage(n);
                if (!this.active)
                    return;
                this.page = this.clampPage(this.page);
                this.settle(false);
            }
            case EditorResolutionChanged(int denominator) -> {
                this.denominator = denominator;
                this.onGeometryChanged();
            }
            case EditorClipChanged(boolean exists, double lengthBeats, var notes) -> {
                this.lengthBeats = lengthBeats;
                this.onGeometryChanged();
            }
            case RequestEditorPage(int delta, boolean animate) -> {
                if (!this.active)
                    return;
                int target = this.clampPage(this.page + delta);
                if (target == this.page)
                    return;
                this.page = target;
                this.settle(animate);
            }
            default -> { }
        }
    }
}
