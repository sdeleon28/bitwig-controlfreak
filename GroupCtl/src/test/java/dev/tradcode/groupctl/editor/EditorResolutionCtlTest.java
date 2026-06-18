package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

class EditorResolutionCtlTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    private static int lastTopColor(FakeEventBus bus, TopButton btn) {
        for (int i = bus.events.size() - 1; i >= 0; i--)
            if (bus.events.get(i) instanceof PaintTopButton p && p.btn() == btn)
                return p.color();
        return -1;
    }

    @Test
    void ignoresButtonsUntilTheEditorPageIsActive() {
        FakeEventBus bus = new FakeEventBus();
        new EditorResolutionCtl(bus);
        bus.send(new TopButtonClick(TopButton.SESSION));
        assertNull(bus.last(EditorResolutionChanged.class));
    }

    @Test
    void resetsToDefaultAndEmitsOnEntry() {
        FakeEventBus bus = new FakeEventBus();
        new EditorResolutionCtl(bus);
        bus.send(new PageSelected(EDITOR));
        assertEquals(8, bus.last(EditorResolutionChanged.class).denominator());
    }

    @Test
    void sessionZoomsOutToCoarsest() {
        FakeEventBus bus = new FakeEventBus();
        new EditorResolutionCtl(bus);
        bus.send(new PageSelected(EDITOR)); // 1/8

        bus.send(new TopButtonClick(TopButton.SESSION)); // -> 1/4
        assertEquals(4, bus.last(EditorResolutionChanged.class).denominator());

        // Already coarsest: no further change emitted.
        long before = bus.count(EditorResolutionChanged.class);
        bus.send(new TopButtonClick(TopButton.SESSION));
        assertEquals(before, bus.count(EditorResolutionChanged.class));
    }

    @Test
    void user1ZoomsInToFinest() {
        FakeEventBus bus = new FakeEventBus();
        new EditorResolutionCtl(bus);
        bus.send(new PageSelected(EDITOR)); // 1/8

        bus.send(new TopButtonClick(TopButton.USER_1)); // -> 1/16
        assertEquals(16, bus.last(EditorResolutionChanged.class).denominator());
        bus.send(new TopButtonClick(TopButton.USER_1)); // -> 1/32
        assertEquals(32, bus.last(EditorResolutionChanged.class).denominator());

        long before = bus.count(EditorResolutionChanged.class);
        bus.send(new TopButtonClick(TopButton.USER_1)); // already finest
        assertEquals(before, bus.count(EditorResolutionChanged.class));
    }

    @Test
    void paintsBothButtonsAtTheDefaultResolution() {
        FakeEventBus bus = new FakeEventBus();
        new EditorResolutionCtl(bus);
        bus.send(new PageSelected(EDITOR)); // 1/8, off both rails

        assertEquals(EditorColors.RESOLUTION_COLOR, lastTopColor(bus, TopButton.SESSION));
        assertEquals(EditorColors.RESOLUTION_COLOR, lastTopColor(bus, TopButton.USER_1));
    }

    @Test
    void doesNotPaintZoomOutButtonAtCoarsest() {
        FakeEventBus bus = new FakeEventBus();
        new EditorResolutionCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new TopButtonClick(TopButton.SESSION)); // -> 1/4 (coarsest)

        assertEquals(0, lastTopColor(bus, TopButton.SESSION));
        assertEquals(EditorColors.RESOLUTION_COLOR, lastTopColor(bus, TopButton.USER_1));
    }

    @Test
    void doesNotPaintZoomInButtonAtFinest() {
        FakeEventBus bus = new FakeEventBus();
        new EditorResolutionCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new TopButtonClick(TopButton.USER_1)); // 1/16
        bus.send(new TopButtonClick(TopButton.USER_1)); // 1/32 (finest)

        assertEquals(EditorColors.RESOLUTION_COLOR, lastTopColor(bus, TopButton.SESSION));
        assertEquals(0, lastTopColor(bus, TopButton.USER_1));
    }

    @Test
    void goesQuietAfterLeavingThePage() {
        FakeEventBus bus = new FakeEventBus();
        new EditorResolutionCtl(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new PageSelected(1));

        long before = bus.count(EditorResolutionChanged.class);
        bus.send(new TopButtonClick(TopButton.SESSION));
        assertEquals(before, bus.count(EditorResolutionChanged.class));
    }
}
