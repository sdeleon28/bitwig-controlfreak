package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.RequestExplorerPage;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

class ExplorerPageCtlTest {

    /** A grid broadcast carrying only paging info (slots are irrelevant here). */
    private static ExplorerGridChanged grid(int totalPages, int page) {
        return new ExplorerGridChanged(List.of(), totalPages, page);
    }

    @Test
    void doesNotPageWithoutContent() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerPageCtl(bus);
        bus.send(new PageSelected(1)); // no grid yet -> totalPages 1, page 0
        bus.send(new TopButtonClick(TopButton.MIXER));
        assertNull(bus.last(RequestExplorerPage.class));
    }

    @Test
    void forwardStepsWhenNotOnTheLastPage() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerPageCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(grid(3, 0));

        bus.send(new TopButtonClick(TopButton.MIXER));
        assertEquals(1, bus.last(RequestExplorerPage.class).delta());
    }

    @Test
    void backStepsWhenNotOnTheFirstPage() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerPageCtl(bus);
        bus.send(new PageSelected(1));
        bus.send(grid(3, 2));

        bus.send(new TopButtonClick(TopButton.USER_2));
        assertEquals(-1, bus.last(RequestExplorerPage.class).delta());
    }

    @Test
    void doesNotStepPastEitherEnd() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerPageCtl(bus);
        bus.send(new PageSelected(1));

        bus.send(grid(3, 2));                          // last page
        bus.send(new TopButtonClick(TopButton.MIXER)); // no next
        bus.send(grid(3, 0));                          // first page
        bus.send(new TopButtonClick(TopButton.USER_2)); // no prev

        assertNull(bus.last(RequestExplorerPage.class));
    }

    @Test
    void ignoresClicksOffTheExplorerPage() {
        FakeEventBus bus = new FakeEventBus();
        new ExplorerPageCtl(bus);
        bus.send(grid(3, 0)); // cached, but page never activated
        bus.send(new TopButtonClick(TopButton.MIXER));
        assertNull(bus.last(RequestExplorerPage.class));
    }
}
