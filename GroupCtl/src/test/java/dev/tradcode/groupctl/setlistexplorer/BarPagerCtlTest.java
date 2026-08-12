package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.RequestExplorerPage;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

class BarPagerCtlTest {

    private static int lastSideColor(FakeEventBus bus, SideButton btn) {
        for (int i = bus.events.size() - 1; i >= 0; i--)
            if (bus.events.get(i) instanceof PaintSideButton p && p.btn() == btn)
                return p.color();
        return -1;
    }

    private static ExplorerGridChanged grid(int totalPages, int page) {
        return new ExplorerGridChanged(List.of(), totalPages, page);
    }

    /** Engaged, on page, showing bar-page `page` of `totalPages`. */
    private static FakeEventBus at(int totalPages, int page) {
        FakeEventBus bus = new FakeEventBus();
        new BarPagerCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerModeChanged(true));
        bus.send(grid(totalPages, page));
        return bus;
    }

    @Test
    void pagesBarsFromTheMiddle() {
        FakeEventBus bus = at(3, 1);
        bus.send(new SideButtonClick(SideButton.VOLUME));
        assertEquals(-1, bus.last(RequestExplorerPage.class).delta());
        bus.send(new SideButtonClick(SideButton.PAN));
        assertEquals(1, bus.last(RequestExplorerPage.class).delta());
    }

    @Test
    void litCyanWhenAnotherWindowExists() {
        FakeEventBus bus = at(3, 1);
        assertEquals(SetlistColors.PAGER, lastSideColor(bus, SideButton.VOLUME));
        assertEquals(SetlistColors.PAGER, lastSideColor(bus, SideButton.PAN));
    }

    @Test
    void darkAndInertAtTheEnds() {
        FakeEventBus bus = at(3, 0);
        assertEquals(0, lastSideColor(bus, SideButton.VOLUME)); // no previous window
        bus.send(new SideButtonClick(SideButton.VOLUME));
        assertNull(bus.last(RequestExplorerPage.class));
    }

    @Test
    void blanksAndIgnoresWhenNotInSetlistMode() {
        FakeEventBus bus = new FakeEventBus();
        new BarPagerCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(grid(3, 1)); // a normal-mode grid arrives; never engaged
        assertEquals(0, lastSideColor(bus, SideButton.VOLUME));
        assertEquals(0, lastSideColor(bus, SideButton.PAN));
        bus.send(new SideButtonClick(SideButton.PAN));
        assertNull(bus.last(RequestExplorerPage.class));
    }
}
