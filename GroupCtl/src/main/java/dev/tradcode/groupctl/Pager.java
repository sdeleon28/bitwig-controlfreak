package dev.tradcode.groupctl;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

enum Page {
    GROUPCTL(0),
    PROJECT_EXPLORER(1);

    // remember to update this!
    static int getPageCount() {
        return 2;
    }

    private final int value;

    Page(int value) {
        this.value = value;
    }

    public int getValue() {
        return this.value;
    }
}

public class Pager implements IEventBusSubscriber {
    IEventBus bus;
    int currentPage = 0;

    public Pager(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
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
        this.bus.send(
            new PaintSideButton(SideButton.VOLUME, 0),
            new PaintSideButton(SideButton.PAN, 0),
            new PaintSideButton(SideButton.SEND_A, 0),
            new PaintSideButton(SideButton.SEND_B, 0),
            new PaintSideButton(SideButton.STOP, 0),
            new PaintSideButton(SideButton.MUTE, 0),
            new PaintSideButton(SideButton.SOLO, 0),
            new PaintSideButton(SideButton.RECORD_ARM, 0)
        );
        for (int i = 1; i <= 64; i++)
            this.bus.send(new PaintPad(i, 0));
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
