package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

public class EditorResolutionCtl implements IEventBusSubscriber {
    static final int COARSEST = 4;
    static final int FINEST = 32;

    IEventBus bus;
    int denominator = EditorConstants.DEFAULT_DENOMINATOR;
    boolean pageActive = false;

    public EditorResolutionCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void coarsen() {
        if (this.denominator <= COARSEST)
            return;
        this.denominator /= 2;
        this.bus.send(new EditorResolutionChanged(this.denominator));
        this.paint();
    }

    private void finen() {
        if (this.denominator >= FINEST)
            return;
        this.denominator *= 2;
        this.bus.send(new EditorResolutionChanged(this.denominator));
        this.paint();
    }

    private void paint() {
        if (!this.pageActive)
            return;
        int coarserColor = this.denominator > COARSEST ? EditorColors.RESOLUTION_COLOR : 0;
        int finerColor = this.denominator < FINEST ? EditorColors.RESOLUTION_COLOR : 0;
        this.bus.send(
            new PaintTopButton(TopButton.SESSION, coarserColor),
            new PaintTopButton(TopButton.USER_1, finerColor)
        );
    }

    public void on(Event event) {
        switch (event) {
            case TopButtonClick(var btn) when this.pageActive && btn == TopButton.SESSION ->
                this.coarsen();
            case TopButtonClick(var btn) when this.pageActive && btn == TopButton.USER_1 ->
                this.finen();
            case PageSelected(int n) -> {
                // TODO: resolution should just be persistent
                boolean wasActive = this.pageActive;
                this.pageActive = Page.isEditorPage(n);
                if (this.pageActive) {
                    // Fresh view when the editor opens, but the resolution rides
                    // along when hopping between the two editor pages.
                    if (!wasActive) {
                        this.denominator = EditorConstants.DEFAULT_DENOMINATOR;
                        this.bus.send(new EditorResolutionChanged(this.denominator));
                    }
                    this.paint();
                }
            }
            default -> { }
        }
    }
}
