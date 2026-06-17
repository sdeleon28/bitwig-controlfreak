package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.RequestExplorerPage;
import dev.tradcode.groupctl.events.Event;
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
                this.page > 0 ? ExplorerColors.PAGE_COLOR : 0
            ),
            new PaintTopButton(
                TopButton.MIXER,
                this.page < this.totalPages - 1
                    ? ExplorerColors.PAGE_COLOR
                    : 0
            )
        );
    }

    public void on(Event event) {
        switch (event) {
            case TopButtonClick(var btn)when this.pageActive && btn == TopButton.USER_2 -> {
                if (this.page > 0)
                    this.bus.send(new RequestExplorerPage(-1));
            }
            case TopButtonClick(var btn) when this.pageActive && btn == TopButton.MIXER -> {
                if (this.page < this.totalPages - 1)
                    this.bus.send(new RequestExplorerPage(1));
            }
            case ExplorerGridChanged(var slots, int totalPages, int page) -> {
                this.totalPages = Math.max(1, totalPages);
                this.page = page;
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
