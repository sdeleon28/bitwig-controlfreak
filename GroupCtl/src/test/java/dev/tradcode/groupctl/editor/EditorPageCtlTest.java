package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.BlinkTopButton;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;
import dev.tradcode.groupctl.events.TopButtonReleased;

class EditorPageCtlTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    private static int lastTopColor(FakeEventBus bus, TopButton btn) {
        for (int i = bus.events.size() - 1; i >= 0; i--)
            if (bus.events.get(i) instanceof PaintTopButton p && p.btn() == btn)
                return p.color();
        return -1;
    }

    private static int lastBlinkColor(FakeEventBus bus, TopButton btn) {
        for (int i = bus.events.size() - 1; i >= 0; i--)
            if (bus.events.get(i) instanceof BlinkTopButton b && b.btn() == btn)
                return b.color();
        return -1;
    }

    private static void enter(FakeEventBus bus, int page, int totalPages) {
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(page, totalPages));
    }

    @Test
    void ignoresArrowsUntilTheEditorPageIsActive() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        bus.send(new EditorPageChanged(0, 2));
        bus.send(new TopButtonClick(TopButton.RIGHT));
        bus.send(new TopButtonReleased(TopButton.RIGHT));
        assertNull(bus.last(RequestEditorPage.class));
    }

    @Test
    void pagesNextOnRightReleaseNotOnPress() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        enter(bus, 0, 2);

        bus.send(new TopButtonClick(TopButton.RIGHT));
        assertNull(bus.last(RequestEditorPage.class)); // the press alone does not page

        bus.send(new TopButtonReleased(TopButton.RIGHT));
        assertEquals(1, bus.last(RequestEditorPage.class).delta());
    }

    @Test
    void pagesPreviousOnLeftRelease() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        enter(bus, 1, 2);

        bus.send(new TopButtonClick(TopButton.LEFT));
        bus.send(new TopButtonReleased(TopButton.LEFT));
        assertEquals(-1, bus.last(RequestEditorPage.class).delta());
    }

    @Test
    void doesNotPageBeyondTheRails() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        bus.send(new PageSelected(EDITOR));

        bus.send(new EditorPageChanged(0, 2)); // already at the first page
        bus.send(new TopButtonClick(TopButton.LEFT));
        bus.send(new TopButtonReleased(TopButton.LEFT));
        assertNull(bus.last(RequestEditorPage.class));

        bus.send(new EditorPageChanged(1, 2)); // already at the last page
        bus.send(new TopButtonClick(TopButton.RIGHT));
        bus.send(new TopButtonReleased(TopButton.RIGHT));
        assertNull(bus.last(RequestEditorPage.class));
    }

    @Test
    void holdingBothArrowsEntersPagerModeAndSuppressesPaging() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        enter(bus, 0, 2);

        bus.send(new TopButtonClick(TopButton.LEFT));
        bus.send(new TopButtonClick(TopButton.RIGHT)); // both down -> mode
        assertTrue(bus.last(EditorPagerMode.class).active());

        bus.send(new TopButtonReleased(TopButton.LEFT));
        bus.send(new TopButtonReleased(TopButton.RIGHT));
        assertNull(bus.last(RequestEditorPage.class)); // the chord never pages
    }

    @Test
    void tappingAnArrowInModeExitsWithoutPaging() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        enter(bus, 0, 2);
        bus.send(new EditorPagerMode(true));

        bus.send(new TopButtonClick(TopButton.LEFT));
        assertFalse(bus.last(EditorPagerMode.class).active()); // dropped the mode

        bus.send(new TopButtonReleased(TopButton.LEFT));
        assertNull(bus.last(RequestEditorPage.class)); // and did not page
    }

    @Test
    void flashesBothArrowsWhileInPagerMode() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        enter(bus, 0, 2);

        bus.send(new EditorPagerMode(true));
        assertEquals(EditorColors.PAGER_ARROW, lastBlinkColor(bus, TopButton.LEFT));
        assertEquals(EditorColors.PAGER_ARROW, lastBlinkColor(bus, TopButton.RIGHT));
    }

    @Test
    void litsOnlyTheReachableDirections() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        bus.send(new PageSelected(EDITOR));

        bus.send(new EditorPageChanged(0, 2)); // first of two: only next is reachable
        assertEquals(0, lastTopColor(bus, TopButton.LEFT));
        assertEquals(EditorColors.PAGE_COLOR, lastTopColor(bus, TopButton.RIGHT));

        bus.send(new EditorPageChanged(1, 2)); // last of two: only previous is reachable
        assertEquals(EditorColors.PAGE_COLOR, lastTopColor(bus, TopButton.LEFT));
        assertEquals(0, lastTopColor(bus, TopButton.RIGHT));
    }

    @Test
    void litsBothDirectionsOnAMiddlePage() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(1, 4));

        assertEquals(EditorColors.PAGE_COLOR, lastTopColor(bus, TopButton.LEFT));
        assertEquals(EditorColors.PAGE_COLOR, lastTopColor(bus, TopButton.RIGHT));
    }

    @Test
    void goesQuietAfterLeavingThePage() {
        FakeEventBus bus = new FakeEventBus();
        new EditorPageCtl(bus);
        enter(bus, 0, 2);
        bus.send(new PageSelected(0));

        bus.send(new TopButtonClick(TopButton.RIGHT));
        bus.send(new TopButtonReleased(TopButton.RIGHT));
        assertNull(bus.last(RequestEditorPage.class));
    }
}
