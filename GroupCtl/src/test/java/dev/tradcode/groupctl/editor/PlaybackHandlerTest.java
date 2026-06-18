package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.PlaybackUpdate;
import dev.tradcode.groupctl.editor.events.RequestStartPlayback;
import dev.tradcode.groupctl.editor.events.RequestStopPlayback;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

class PlaybackHandlerTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    @Test
    void blinksStopButtonWhilePlayingOnTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));

        bus.send(new PlaybackUpdate(true));
        BlinkPad blink = bus.last(BlinkPad.class);
        assertNotNull(blink);
        assertEquals(SideButton.STOP.getValue(), blink.n());
        assertEquals(EditorColors.STOP_COLOR, blink.color());
    }

    @Test
    void turnsStopButtonOffWhenNotPlaying() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));

        bus.send(new PlaybackUpdate(false));
        PaintSideButton off = bus.last(PaintSideButton.class);
        assertNotNull(off);
        assertEquals(SideButton.STOP, off.btn());
        assertEquals(0, off.color());
    }

    @Test
    void doesNotPaintStopButtonOffPageEvenWhilePlaying() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);

        bus.send(new PlaybackUpdate(true));
        assertNull(bus.last(BlinkPad.class));
    }

    @Test
    void pressStartsPlaybackWhenStopped() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new PlaybackUpdate(false));

        bus.send(new SideButtonClick(SideButton.STOP));
        assertNotNull(bus.last(RequestStartPlayback.class));
        assertNull(bus.last(RequestStopPlayback.class));
    }

    @Test
    void pressStopsPlaybackWhilePlaying() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new PlaybackUpdate(true));

        bus.send(new SideButtonClick(SideButton.STOP));
        assertNotNull(bus.last(RequestStopPlayback.class));
        assertNull(bus.last(RequestStartPlayback.class));
    }

    @Test
    void ignoresStopButtonWhenNotOnTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);

        bus.send(new SideButtonClick(SideButton.STOP));
        assertNull(bus.last(RequestStartPlayback.class));
        assertNull(bus.last(RequestStopPlayback.class));
    }

    @Test
    void ignoresOtherSideButtons() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));

        bus.send(new SideButtonClick(SideButton.MUTE));
        assertNull(bus.last(RequestStartPlayback.class));
        assertNull(bus.last(RequestStopPlayback.class));
    }
}
