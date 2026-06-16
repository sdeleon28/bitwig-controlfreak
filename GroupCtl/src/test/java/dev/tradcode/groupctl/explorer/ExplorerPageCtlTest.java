package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerPageChanged;
import dev.tradcode.groupctl.explorer.events.ExplorerPagesChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

class ExplorerPageCtlTest {

    @Test
    void cannotPageWithoutContent() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerPageCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new TopButtonClick(TopButton.MIXER)); // only one page
        assertNull(bus.last(ExplorerPageChanged.class));
    }

    @Test
    void nextAndPrevWalkThroughAvailablePages() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerPageCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerPagesChanged(3));

        bus.send(new TopButtonClick(TopButton.MIXER));
        assertEquals(1, bus.last(ExplorerPageChanged.class).page());
        bus.send(new TopButtonClick(TopButton.MIXER));
        assertEquals(2, bus.last(ExplorerPageChanged.class).page());

        // At last page: no further next.
        long before = bus.count(ExplorerPageChanged.class);
        bus.send(new TopButtonClick(TopButton.MIXER));
        assertEquals(before, bus.count(ExplorerPageChanged.class));

        bus.send(new TopButtonClick(TopButton.USER_2));
        assertEquals(1, bus.last(ExplorerPageChanged.class).page());
    }

    @Test
    void clampsCurrentPageWhenLayoutShrinks() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerPageCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(new ExplorerPagesChanged(3));
        bus.send(new TopButtonClick(TopButton.MIXER));
        bus.send(new TopButtonClick(TopButton.MIXER)); // page 2

        bus.send(new ExplorerPagesChanged(1)); // only one page now
        assertEquals(0, bus.last(ExplorerPageChanged.class).page());
    }
}
