package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;
import dev.tradcode.groupctl.editor.events.RequestEditorSideRepaint;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

class EditorSidePagerCtlTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    private static final class RecordingScheduler implements Scheduler {
        private final List<Runnable> tasks = new ArrayList<>();

        public void schedule(Runnable task, long delayMs) {
            this.tasks.add(task);
        }

        void runAll() {
            for (Runnable t : new ArrayList<>(this.tasks))
                t.run();
        }
    }

    private static int lastSideColor(FakeEventBus bus, SideButton btn) {
        for (int i = bus.events.size() - 1; i >= 0; i--)
            if (bus.events.get(i) instanceof PaintSideButton p && p.btn() == btn)
                return p.color();
        return -1;
    }

    private static int lastBlinkColor(FakeEventBus bus, SideButton btn) {
        for (int i = bus.events.size() - 1; i >= 0; i--)
            if (bus.events.get(i) instanceof BlinkPad b && b.n() == btn.getValue())
                return b.color();
        return -1;
    }

    @Test
    void flashesOneDotPerPageWithTheCurrentPageHighlighted() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSidePagerCtl(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(0, 2));

        assertEquals(EditorColors.PAGE_DOT_CURRENT, lastSideColor(bus, SideButton.VOLUME)); // page 0
        assertEquals(EditorColors.PAGE_DOT, lastSideColor(bus, SideButton.PAN));            // page 1
        assertEquals(0, lastSideColor(bus, SideButton.SEND_A));                             // no page 2
    }

    @Test
    void handsTheColumnBackWhenTheFlashElapses() {
        FakeEventBus bus = new FakeEventBus();
        RecordingScheduler scheduler = new RecordingScheduler();
        new EditorSidePagerCtl(bus, scheduler);

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(0, 2));
        scheduler.runAll();

        assertEquals(0, lastSideColor(bus, SideButton.VOLUME));
        assertNotNull(bus.last(RequestEditorSideRepaint.class));
    }

    @Test
    void blinksTheDotsWhileInPagerMode() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSidePagerCtl(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(0, 2));
        bus.send(new EditorPagerMode(true));

        assertEquals(EditorColors.PAGE_DOT_CURRENT, lastBlinkColor(bus, SideButton.VOLUME));
        assertEquals(EditorColors.PAGE_DOT, lastBlinkColor(bus, SideButton.PAN));
    }

    @Test
    void selectingADotPagesToItAndExitsMode() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSidePagerCtl(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(0, 2));
        bus.send(new EditorPagerMode(true));

        bus.send(new SideButtonClick(SideButton.PAN)); // the second dot -> page 1
        assertEquals(1, bus.last(RequestEditorPage.class).delta());
        assertTrue(modeEndedLast(bus));
    }

    @Test
    void selectingTheCurrentDotJustExitsMode() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSidePagerCtl(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(0, 2));
        bus.send(new EditorPagerMode(true));

        bus.send(new SideButtonClick(SideButton.VOLUME)); // already on page 0
        assertNull(bus.last(RequestEditorPage.class));
        assertTrue(modeEndedLast(bus));
    }

    @Test
    void ignoresDotsBeyondTheTotalPageCount() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSidePagerCtl(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(0, 2)); // only two pages
        bus.send(new EditorPagerMode(true));

        bus.send(new SideButtonClick(SideButton.SEND_A)); // the third dot has no page
        assertNull(bus.last(RequestEditorPage.class));
        assertTrue(bus.last(EditorPagerMode.class).active()); // still in mode
    }

    @Test
    void handsTheColumnBackWhenPagerModeEnds() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSidePagerCtl(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(0, 2));
        bus.send(new EditorPagerMode(true));
        bus.send(new EditorPagerMode(false));

        assertEquals(0, lastSideColor(bus, SideButton.VOLUME));
        assertNotNull(bus.last(RequestEditorSideRepaint.class));
    }

    @Test
    void ignoresSideClicksOutsidePagerMode() {
        FakeEventBus bus = new FakeEventBus();
        new EditorSidePagerCtl(bus, new RecordingScheduler());

        bus.send(new PageSelected(EDITOR));
        bus.send(new EditorPageChanged(0, 2));

        bus.send(new SideButtonClick(SideButton.PAN));
        assertNull(bus.last(RequestEditorPage.class));
        assertNull(bus.last(EditorPagerMode.class));
    }

    private static boolean modeEndedLast(FakeEventBus bus) {
        EditorPagerMode last = bus.last(EditorPagerMode.class);
        return last != null && !last.active();
    }
}
