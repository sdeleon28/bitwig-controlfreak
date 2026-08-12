package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.RequestExplorerPage;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

/**
 * Bar prev/next within the current song, on the VOLUME/PAN side buttons, lit
 * cyan when there is another 64-pad window to page to. These side buttons are
 * the setlist view's alone on this page, so it may blank them when it is not
 * engaged. Reuses the shared reducer's paging via {@link RequestExplorerPage}.
 */
public class BarPagerCtl implements IEventBusSubscriber {
    IEventBus bus;
    int page = 0;
    int totalPages = 1;
    boolean pageActive = false;
    boolean setlist = false;

    public BarPagerCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive || !this.setlist) {
            this.bus.send(
                new PaintSideButton(SideButton.VOLUME, 0),
                new PaintSideButton(SideButton.PAN, 0)
            );
            return;
        }
        this.bus.send(
            new PaintSideButton(SideButton.VOLUME,
                this.page > 0 ? SetlistColors.PAGER : 0),
            new PaintSideButton(SideButton.PAN,
                this.page < this.totalPages - 1 ? SetlistColors.PAGER : 0)
        );
    }

    public void on(Event event) {
        switch (event) {
            case SideButtonClick(var btn)
            when this.pageActive && this.setlist
              && btn == SideButton.VOLUME && this.page > 0 ->
                this.bus.send(new RequestExplorerPage(-1));
            case SideButtonClick(var btn)
            when this.pageActive && this.setlist
              && btn == SideButton.PAN && this.page < this.totalPages - 1 ->
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
