package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

public class EditorPageCtl implements IEventBusSubscriber {
    IEventBus bus;
    int page = 0;
    int totalPages = 1;
    boolean pageActive = false;

    public EditorPageCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive)
            return;
        int prevColor = this.page > 0 ? EditorColors.PAGE_COLOR : 0;
        int nextColor = this.page < this.totalPages - 1 ? EditorColors.PAGE_COLOR : 0;
        this.bus.send(
            new PaintTopButton(TopButton.LEFT, prevColor),
            new PaintTopButton(TopButton.RIGHT, nextColor)
        );
    }

    public void on(Event event) {
        switch (event) {
            case TopButtonClick(var btn)
            when this.pageActive && btn == TopButton.LEFT && this.page > 0 ->
                this.bus.send(new RequestEditorPage(-1));
            case TopButtonClick(var btn)
            when this.pageActive && btn == TopButton.RIGHT && this.page < this.totalPages - 1 ->
                this.bus.send(new RequestEditorPage(1));
            case EditorPageChanged(int page, int totalPages) -> {
                this.page = page;
                this.totalPages = totalPages;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                this.paint();
            }
            default -> { }
        }
    }
}
