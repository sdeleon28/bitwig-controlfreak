package dev.tradcode.groupctl.normalexplorer;

import dev.tradcode.groupctl.baseexplorer.ExplorerColors;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.RequestExplorerPage;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

/**
 * The two project-paging top-button LEDs (LEFT/RIGHT) for the normal explorer.
 * Only active while no setlist is present: in setlist mode LEFT/RIGHT belong to
 * the setlist's song pager, so this control yields those shared buttons by
 * ceasing to paint rather than blanking them (the song pager repaints them).
 */
public class ExplorerPageCtl implements IEventBusSubscriber {
    IEventBus bus;
    int page = 0;
    int totalPages = 1;
    boolean pageActive = false;
    boolean setlist = false;

    public ExplorerPageCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive) {
            this.bus.send(
                new PaintTopButton(TopButton.LEFT, 0),
                new PaintTopButton(TopButton.RIGHT, 0)
            );
            return;
        }
        if (this.setlist)
            return;
        this.bus.send(
            new PaintTopButton(
                TopButton.LEFT,
                this.page > 0 ? ExplorerColors.PAGE_COLOR : 0
            ),
            new PaintTopButton(
                TopButton.RIGHT,
                this.page < this.totalPages - 1 ? ExplorerColors.PAGE_COLOR : 0
            )
        );
    }

    public void on(Event event) {
        switch (event) {
            case TopButtonClick(var btn)
            when this.pageActive && !this.setlist
              && btn == TopButton.LEFT
              && (this.page > 0) ->
                this.bus.send(new RequestExplorerPage(-1));
            case TopButtonClick(var btn)
            when this.pageActive && !this.setlist
              && btn == TopButton.RIGHT
              && (this.page < this.totalPages - 1) ->
                this.bus.send(new RequestExplorerPage(1));
            case ExplorerGridChanged(var slots, int totalPages, int page) -> {
                this.totalPages = Math.max(1, totalPages);
                this.page = page;
                this.paint();
            }
            case ExplorerModeChanged(boolean s) -> {
                this.setlist = s;
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
