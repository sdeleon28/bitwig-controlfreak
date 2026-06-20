package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;
import dev.tradcode.groupctl.editor.events.RequestEditorSideRepaint;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

/**
 * Lends the side-button column to the horizontal pager. Each page is one dot
 * from the top down, the current page brighter than the rest. Paging or changing
 * resolution flashes the dots for about the length of the scroll; holding both
 * arrows turns them into a blinking, tappable page picker. When the takeover
 * ends the column is handed back with {@link RequestEditorSideRepaint} so the
 * playback indicator can repaint itself.
 */
public class EditorSidePagerCtl implements IEventBusSubscriber {
    static final SideButton[] DOTS = SideButton.values(); // top (VOLUME) to bottom (RECORD_ARM)
    static final long FLASH_MS = EditorConstants.GRID_COLS * EditorConstants.SCROLL_STEP_MS;

    IEventBus bus;
    Scheduler scheduler;
    boolean pageActive = false;
    int page = 0;
    int totalPages = 1;
    boolean mode = false;
    int generation = 0;

    public EditorSidePagerCtl(IEventBus bus, Scheduler scheduler) {
        this.bus = bus;
        this.scheduler = scheduler;
        this.bus.subscribe(this);
    }

    private int dotColor(int i) {
        return i == this.page ? EditorColors.PAGE_DOT_CURRENT : EditorColors.PAGE_DOT;
    }

    private void showFlash() {
        for (int i = 0; i < DOTS.length; i++)
            this.bus.send(new PaintSideButton(DOTS[i], i < this.totalPages ? this.dotColor(i) : 0));
    }

    private void showBlink() {
        for (int i = 0; i < DOTS.length; i++) {
            if (i < this.totalPages)
                this.bus.send(new BlinkPad(DOTS[i].getValue(), this.dotColor(i)));
            else
                this.bus.send(new PaintSideButton(DOTS[i], 0));
        }
    }

    private void handBack() {
        for (SideButton b : DOTS)
            this.bus.send(new PaintSideButton(b, 0));
        this.bus.send(new RequestEditorSideRepaint());
    }

    private void startFlash() {
        if (!this.pageActive)
            return;
        int gen = ++this.generation;
        this.showFlash();
        this.scheduler.schedule(() -> {
            if (gen != this.generation)
                return;
            this.handBack();
        }, FLASH_MS);
    }

    private int indexOf(SideButton btn) {
        for (int i = 0; i < DOTS.length; i++)
            if (DOTS[i] == btn)
                return i;
        return -1;
    }

    public void on(Event event) {
        switch (event) {
            case EditorPageChanged(int page, int totalPages) -> {
                this.page = page;
                this.totalPages = totalPages;
                if (this.mode)
                    this.showBlink();
                else
                    this.startFlash();
            }
            case EditorPagerMode(boolean active) -> {
                this.mode = active;
                this.generation++;
                if (active)
                    this.showBlink();
                else
                    this.handBack();
            }
            case SideButtonClick(var btn) when this.pageActive && this.mode -> {
                int i = this.indexOf(btn);
                if (i < 0 || i >= this.totalPages)
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
