package dev.tradcode.groupctl.editor.followplayhead;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.editor.EditorConstants;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorPlaybackPosition;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;

import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

class FollowPlayheadCtlTest {

    private static final int BOTTOM = EditorConstants.PAGE_INDEX_BOTTOM;
    private static final int TOP = EditorConstants.PAGE_INDEX;
    private static final int OFF_PAGE = 0;

    // At the default 1/8 resolution a page spans 4 beats, so beat 5 lives on page 1.
    private static final double BEAT_ON_PAGE_1 = 5.0;
    private static final double BEAT_ON_PAGE_2 = 9.0;

    private static FollowPlayheadCtl onBottomPage(FakeEventBus bus) {
        FollowPlayheadCtl ctl = new FollowPlayheadCtl(bus);
        bus.send(new PageSelected(BOTTOM));
        return ctl;
    }

    private static void toggle(FakeEventBus bus) {
        bus.send(new TopButtonClick(TopButton.USER_2));
    }

    @Test
    void litWhileFollowingDarkWhileIdle() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);

        toggle(bus);
        PaintTopButton lit = bus.last(PaintTopButton.class);
        assertEquals(TopButton.USER_2, lit.btn());
        assertEquals(FollowPlayheadCtl.ENABLED_COLOR, lit.color());

        toggle(bus);
        PaintTopButton dark = bus.last(PaintTopButton.class);
        assertEquals(TopButton.USER_2, dark.btn());
        assertEquals(0, dark.color());
    }

    @Test
    void repaintsToggleStateWhenEnteringTheBottomPage() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);
        toggle(bus);

        bus.send(new PageSelected(OFF_PAGE));
        bus.send(new PageSelected(BOTTOM));

        PaintTopButton paint = bus.last(PaintTopButton.class);
        assertEquals(FollowPlayheadCtl.ENABLED_COLOR, paint.color());
    }

    @Test
    void chasesThePlayheadOntoOffscreenPagesWhileEnabled() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);
        toggle(bus);

        bus.send(new EditorPlaybackPosition(BEAT_ON_PAGE_1));
        RequestEditorPage req = bus.last(RequestEditorPage.class);
        assertNotNull(req);
        assertEquals(1, req.delta());
        assertFalse(req.animate(), "following the playhead bypasses the scroll animation");
    }

    @Test
    void chaseDeltaSpansSeveralPages() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);
        toggle(bus);

        bus.send(new EditorPlaybackPosition(BEAT_ON_PAGE_2));
        assertEquals(2, bus.last(RequestEditorPage.class).delta());
    }

    @Test
    void doesNotChaseWhenTheCurrentPageAlreadyHoldsThePlayhead() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);
        toggle(bus);
        bus.send(new EditorPageChanged(1, 4));

        bus.send(new EditorPlaybackPosition(BEAT_ON_PAGE_1));
        assertNull(bus.last(RequestEditorPage.class));
    }

    @Test
    void honoursTheResolutionWhenLocatingThePlayhead() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);
        toggle(bus);
        bus.send(new EditorResolutionChanged(16)); // a page now spans 2 beats

        bus.send(new EditorPlaybackPosition(BEAT_ON_PAGE_1));
        assertEquals(2, bus.last(RequestEditorPage.class).delta());
    }

    @Test
    void doesNotChaseWhileDisabled() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);

        bus.send(new EditorPlaybackPosition(BEAT_ON_PAGE_1));
        assertNull(bus.last(RequestEditorPage.class));
    }

    @Test
    void doesNotChaseWhenAStoppedTransportReportsNoPlayhead() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);
        toggle(bus);

        bus.send(new EditorPlaybackPosition(-1.0));
        assertNull(bus.last(RequestEditorPage.class));
    }

    @Test
    void stopsChasingOnceOffEveryEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);
        toggle(bus);
        bus.send(new PageSelected(OFF_PAGE));

        bus.send(new EditorPlaybackPosition(BEAT_ON_PAGE_1));
        assertNull(bus.last(RequestEditorPage.class));
    }

    @Test
    void keepsChasingAfterMovingToTheTopEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);
        toggle(bus);
        bus.send(new PageSelected(TOP));

        bus.send(new EditorPlaybackPosition(BEAT_ON_PAGE_1));
        assertEquals(1, bus.last(RequestEditorPage.class).delta());
    }

    @Test
    void jumpsToThePlayheadImmediatelyWhenEnabledMidPlayback() {
        FakeEventBus bus = new FakeEventBus();
        onBottomPage(bus);
        bus.send(new EditorPlaybackPosition(BEAT_ON_PAGE_1));
        assertNull(bus.last(RequestEditorPage.class)); // still idle

        toggle(bus);
        assertEquals(1, bus.last(RequestEditorPage.class).delta());
    }

    @Test
    void armsTheChaseFromTheTopEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new FollowPlayheadCtl(bus);
        bus.send(new PageSelected(TOP));

        toggle(bus);
        PaintTopButton lit = bus.last(PaintTopButton.class);
        assertEquals(TopButton.USER_2, lit.btn());
        assertEquals(FollowPlayheadCtl.ENABLED_COLOR, lit.color());

        bus.send(new EditorPlaybackPosition(BEAT_ON_PAGE_1));
        assertEquals(1, bus.last(RequestEditorPage.class).delta());
    }
}
