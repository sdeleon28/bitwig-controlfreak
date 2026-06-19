package dev.tradcode.groupctl;

import dev.tradcode.groupctl.events.ClearLaunchpad;
import dev.tradcode.groupctl.events.ClearTwister;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

public class Pager implements IEventBusSubscriber {
    IEventBus bus;
    int currentPage = 0;

    public Pager(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.clear();
        this.paint();
    }

    private void prevPage() {
        if (this.currentPage <= 0)
            return;
        this.currentPage--;
        this.clear();
        this.paint();
        this.bus.send(new PageSelected(this.currentPage));
    }

    private void nextPage() {
        if (this.currentPage >= Page.getPageCount() - 1)
            return;
        this.currentPage++;
        this.clear();
        this.paint();
        this.bus.send(new PageSelected(this.currentPage));
    }

    private void clear() {
        this.bus.send(new ClearLaunchpad(), new ClearTwister());
    }

    private void paint() {
        this.bus.send(
            new PaintTopButton(TopButton.UP, 0),
            new PaintTopButton(TopButton.DOWN, 0)
        );
        if (this.currentPage != 0)
            this.bus.send(new PaintTopButton(TopButton.UP, 69));
        if (this.currentPage < Page.getPageCount() - 1)
            this.bus.send(new PaintTopButton(TopButton.DOWN, 69));
    }

    public void on(Event event) {
        switch (event) {
            case TopButtonClick(var btn) when btn == TopButton.UP -> this.prevPage();
            case TopButtonClick(var btn) when btn == TopButton.DOWN -> this.nextPage();
            default -> { }
        }
    }
}
