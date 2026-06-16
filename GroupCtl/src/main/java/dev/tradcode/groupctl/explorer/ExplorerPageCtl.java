package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.Colors;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.ExplorerPageChanged;
import dev.tradcode.groupctl.events.ExplorerPagesChanged;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

public class ExplorerPageCtl implements IEventBusSubscriber {
    IEventBus bus;
    int page = 0;
    int totalPages = 1;
    boolean pageActive = false;

    public ExplorerPageCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void prev() {
        if (this.page <= 0)
            return;
        this.page--;
        this.bus.send(new ExplorerPageChanged(this.page));
        this.paint();
    }

    private void next() {
        if (this.page >= this.totalPages - 1)
            return;
        this.page++;
        this.bus.send(new ExplorerPageChanged(this.page));
        this.paint();
    }

    private void paint() {
        if (!this.pageActive) {
            this.bus.send(
                new PaintTopButton(TopButton.USER_2, 0),
                new PaintTopButton(TopButton.MIXER, 0)
            );
            return;
        }
        this.bus.send(
            new PaintTopButton(
                TopButton.USER_2,
                this.page > 0 ? Colors.EXPLORER_PAGE_COLOR : 0
            ),
            new PaintTopButton(
                TopButton.MIXER,
                this.page < this.totalPages - 1
                    ? Colors.EXPLORER_PAGE_COLOR
                    : 0
            )
        );
    }

    public void on(Event event) {
        switch (event) {
            case TopButtonClick(var btn)when this.pageActive && btn == TopButton.USER_2 ->
                this.prev();
            case TopButtonClick(var btn) when this.pageActive && btn == TopButton.MIXER ->
                this.next();
            case ExplorerPagesChanged(int tp) -> {
                this.totalPages = Math.max(1, tp);
                if (this.page > this.totalPages - 1) {
                    this.page = this.totalPages - 1;
                    this.bus.send(new ExplorerPageChanged(this.page));
                }
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                this.paint();
            }
            default -> { }
        }
    }
}
