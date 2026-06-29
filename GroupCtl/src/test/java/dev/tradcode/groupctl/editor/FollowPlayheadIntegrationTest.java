package dev.tradcode.groupctl.editor;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.editor.animatedscroll.AnimatedScroll;
import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorPlaybackPosition;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.followplayhead.FollowPlayhead;
import dev.tradcode.groupctl.editor.instantscroll.InstantScroll;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

/** The full pager + scroller + follow chain, the way Editor wires it. */
class FollowPlayheadIntegrationTest {

    private static final int BOTTOM = EditorConstants.PAGE_INDEX_BOTTOM;

    private static final class ImmediateScheduler implements Scheduler {
        public void schedule(Runnable task, long delayMs) {
            task.run();
        }
    }

    private static int lastOffset(FakeEventBus bus) {
        EditorColumnOffsetChanged c = bus.last(EditorColumnOffsetChanged.class);
        return c == null ? -1 : c.colOffset();
    }

    private static FakeEventBus wired() {
        FakeEventBus bus = new FakeEventBus();
        new EditorHorizontalPager(bus);
        new AnimatedScroll(bus, new ImmediateScheduler());
        new InstantScroll(bus);
        new FollowPlayhead(bus);
        bus.send(new PageSelected(BOTTOM));
        bus.send(new EditorClipChanged(true, 64.0, new ArrayList<>())); // 16 pages at 1/8
        bus.send(new EditorResolutionChanged(8));                       // 4 beats per page
        return bus;
    }

    @Test
    void instantlyAdvancesTheColumnOffsetAsThePlayheadCrossesPages() {
        FakeEventBus bus = wired();
        bus.send(new TopButtonClick(TopButton.USER_2)); // enable following

        bus.send(new EditorPlaybackPosition(5.0));  // page 1
        assertEquals(8, lastOffset(bus));

        bus.send(new EditorPlaybackPosition(9.0));  // page 2
        assertEquals(16, lastOffset(bus));

        bus.send(new EditorPlaybackPosition(13.0)); // page 3
        assertEquals(24, lastOffset(bus));
    }

    @Test
    void doesNotAdvanceWhileFollowingIsOff() {
        FakeEventBus bus = wired();

        bus.send(new EditorPlaybackPosition(9.0));
        assertEquals(0, lastOffset(bus));
    }
}
