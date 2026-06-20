package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.BlinkTopButton;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;
import dev.tradcode.groupctl.events.TopButtonReleased;

/**
 * Drives the editor's left/right arrows. A single arrow taps a page on release,
 * so that holding both arrows together instead arms horizontal pager mode. While
 * the mode is on the arrows flash; tapping either one drops the mode without
 * paging. {@link EditorHorizontalPager} performs the actual paging and reports
 * the reachable rails back through {@link EditorPageChanged}.
 */
public class EditorPageCtl implements IEventBusSubscriber {
    IEventBus bus;
    int page = 0;
    int totalPages = 1;
    boolean pageActive = false;
    boolean mode = false;

    boolean leftHeld = false;
    boolean rightHeld = false;
    boolean leftConsumed = false;
    boolean rightConsumed = false;

    public EditorPageCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive)
            return;
        if (this.mode) {
            this.bus.send(
                new BlinkTopButton(TopButton.LEFT, EditorColors.PAGER_ARROW),
                new BlinkTopButton(TopButton.RIGHT, EditorColors.PAGER_ARROW)
            );
            return;
        }
        int prevColor = this.page > 0 ? EditorColors.PAGE_COLOR : 0;
        int nextColor = this.page < this.totalPages - 1 ? EditorColors.PAGE_COLOR : 0;
        this.bus.send(
            new PaintTopButton(TopButton.LEFT, prevColor),
            new PaintTopButton(TopButton.RIGHT, nextColor)
        );
    }

    private void arrowDown(boolean left) {
        if (left)
            this.leftHeld = true;
        else
            this.rightHeld = true;

        if (this.mode) {
            if (left) this.leftConsumed = true; else this.rightConsumed = true;
            this.bus.send(new EditorPagerMode(false));
        } else if (this.leftHeld && this.rightHeld) {
            this.leftConsumed = true;
            this.rightConsumed = true;
            this.bus.send(new EditorPagerMode(true));
        }
    }

    private void arrowUp(boolean left) {
        boolean wasConsumed = left ? this.leftConsumed : this.rightConsumed;
        if (left) {
            this.leftHeld = false;
            this.leftConsumed = false;
        } else {
            this.rightHeld = false;
            this.rightConsumed = false;
        }
        if (wasConsumed || this.mode)
            return;
        if (left && this.page > 0)
            this.bus.send(new RequestEditorPage(-1));
        else if (!left && this.page < this.totalPages - 1)
            this.bus.send(new RequestEditorPage(1));
    }

    private void resetGesture() {
        this.leftHeld = false;
        this.rightHeld = false;
        this.leftConsumed = false;
        this.rightConsumed = false;
    }

    public void on(Event event) {
        switch (event) {
            case TopButtonClick(var btn) when this.pageActive && btn == TopButton.LEFT ->
                this.arrowDown(true);
            case TopButtonClick(var btn) when this.pageActive && btn == TopButton.RIGHT ->
                this.arrowDown(false);
            case TopButtonReleased(var btn) when this.pageActive && btn == TopButton.LEFT ->
                this.arrowUp(true);
            case TopButtonReleased(var btn) when this.pageActive && btn == TopButton.RIGHT ->
                this.arrowUp(false);
            case EditorPagerMode(boolean active) -> {
                this.mode = active;
                this.paint();
            }
            case EditorPageChanged(int page, int totalPages) -> {
                this.page = page;
                this.totalPages = totalPages;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                this.mode = false;
                this.resetGesture();
                this.paint();
            }
            default -> { }
        }
    }
}
