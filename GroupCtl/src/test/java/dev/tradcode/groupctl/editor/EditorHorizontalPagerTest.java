package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.RequestColumnScroll;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;

class EditorHorizontalPagerTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;
    private static final int BOTTOM = EditorConstants.PAGE_INDEX_BOTTOM;
    private static final int COLS = EditorConstants.GRID_COLS;

    private static int lastPage(FakeEventBus bus) {
        return bus.last(EditorPageChanged.class).page();
    }

    private static int lastTotal(FakeEventBus bus) {
        return bus.last(EditorPageChanged.class).totalPages();
    }

    private static RequestColumnScroll lastScroll(FakeEventBus bus) {
        return bus.last(RequestColumnScroll.class);
    }

    private static EditorHorizontalPager pager(FakeEventBus bus) {
        return new EditorHorizontalPager(bus);
    }

    @Test
    void reportsTheTotalPageCountForTheResolution() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));            // 1/8 -> 16 pages over the 64-beat window
        assertEquals(16, lastTotal(bus));

        bus.send(new EditorResolutionChanged(4));      // 1/4 -> 8 pages
        assertEquals(8, lastTotal(bus));

        bus.send(new EditorResolutionChanged(32));     // 1/32 -> 64 pages
        assertEquals(64, lastTotal(bus));
    }

    @Test
    void boundsThePageCountToTheClipLength() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, 2.0, List.of())); // a 2-beat clip fits in one 4-beat page
        assertEquals(1, lastTotal(bus));
    }

    @Test
    void keepsTheClipBoundWhenZoomingIn() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, 2.0, List.of()));
        bus.send(new EditorResolutionChanged(16));     // read window alone would offer 4 pages
        assertEquals(1, lastTotal(bus));
    }

    @Test
    void cannotPageBeyondAShortClip() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorClipChanged(true, 2.0, List.of()));   // single page
        bus.send(new RequestEditorPage(1, true));
        assertEquals(0, lastPage(bus));
    }

    @Test
    void clampsThePageWhenTheClipShrinks() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorResolutionChanged(32));     // 8 pages over the read window
        bus.send(new RequestEditorPage(7, true));      // last page
        assertEquals(7, lastPage(bus));

        bus.send(new EditorClipChanged(true, 1.0, List.of()));   // 1-beat clip -> one page
        assertEquals(0, lastPage(bus));
        assertEquals(1, lastTotal(bus));
    }

    @Test
    void clampsPagingToTheAvailableRange() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR)); // 1/8 -> 16 pages (0..15)

        bus.send(new RequestEditorPage(-1, true)); // can't go before the first page
        assertEquals(0, lastPage(bus));

        bus.send(new RequestEditorPage(50, true)); // can't go past the last page
        assertEquals(15, lastPage(bus));
    }

    @Test
    void clampsThePageWhenResolutionCoarsens() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorResolutionChanged(32)); // 64 pages
        bus.send(new RequestEditorPage(63, true)); // last page
        assertEquals(63, lastPage(bus));

        bus.send(new EditorResolutionChanged(4));  // 8 pages -> clamp to 7
        assertEquals(7, lastPage(bus));
    }

    @Test
    void keepsTheHorizontalPageOnReentry() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1, true));
        assertEquals(1, lastPage(bus));

        bus.send(new PageSelected(0));
        bus.send(new PageSelected(EDITOR));
        assertEquals(1, lastPage(bus));
    }

    @Test
    void keepsTheHorizontalPageWhenHoppingBetweenEditorPages() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1, true));
        assertEquals(1, lastPage(bus));

        bus.send(new PageSelected(BOTTOM));
        assertEquals(1, lastPage(bus));
    }

    @Test
    void announcesTheDestinationPageImmediatelyWhenPaging() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1, true));
        assertEquals(1, lastPage(bus));
    }

    @Test
    void snapsToTheColumnBoundaryInstantlyOnEntry() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        RequestColumnScroll scroll = lastScroll(bus);
        assertEquals(0, scroll.targetOffset());
        assertFalse(scroll.animate(), "a fresh entry snaps, it does not animate");
    }

    @Test
    void requestsAColumnScrollToThePageBoundaryWhenPaging() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(1, true));
        assertEquals(COLS, lastScroll(bus).targetOffset());
    }

    @Test
    void carriesThePagingAnimateFlagThroughToTheScroll() {
        FakeEventBus animated = new FakeEventBus();
        pager(animated);
        animated.send(new PageSelected(EDITOR));
        animated.send(new RequestEditorPage(1, true));
        assertTrue(lastScroll(animated).animate());

        FakeEventBus instant = new FakeEventBus();
        pager(instant);
        instant.send(new PageSelected(EDITOR));
        instant.send(new RequestEditorPage(1, false));
        assertFalse(lastScroll(instant).animate());
    }

    @Test
    void snapsInstantlyWhenTheClipShrinksUnderTheCurrentPage() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        bus.send(new RequestEditorPage(3, true)); // column offset 24
        bus.send(new EditorClipChanged(true, 1.0, List.of())); // 1-beat clip -> single page

        RequestColumnScroll scroll = lastScroll(bus);
        assertEquals(0, scroll.targetOffset());
        assertFalse(scroll.animate());
    }

    @Test
    void doesNotRequestAScrollWhenPagingIsClamped() {
        FakeEventBus bus = new FakeEventBus();
        pager(bus);

        bus.send(new PageSelected(EDITOR));
        long before = bus.count(RequestColumnScroll.class);
        bus.send(new RequestEditorPage(-1, true)); // already on page 0
        assertEquals(before, bus.count(RequestColumnScroll.class));
    }
}
