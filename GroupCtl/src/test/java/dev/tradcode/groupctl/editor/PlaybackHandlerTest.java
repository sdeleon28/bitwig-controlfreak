package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.PlaybackUpdate;
import dev.tradcode.groupctl.editor.events.RequestStartPlayback;
import dev.tradcode.groupctl.editor.events.RequestStopPlayback;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.BlinkTopButton;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

class PlaybackHandlerTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;

    @Test
    void blinksTransportButtonWhilePlayingOnTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));

        bus.send(new PlaybackUpdate(true));
        BlinkTopButton blink = bus.last(BlinkTopButton.class);
        assertNotNull(blink);
        assertEquals(TopButton.MIXER, blink.btn());
        assertEquals(EditorColors.STOP_COLOR, blink.color());
    }

    @Test
    void turnsTransportButtonOffWhenNotPlaying() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));

        bus.send(new PlaybackUpdate(false));
        PaintTopButton off = bus.last(PaintTopButton.class);
        assertNotNull(off);
        assertEquals(TopButton.MIXER, off.btn());
        assertEquals(0, off.color());
    }

    @Test
    void doesNotPaintTransportButtonOffPageEvenWhilePlaying() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);

        bus.send(new PlaybackUpdate(true));
        assertNull(bus.last(BlinkTopButton.class));
    }

    @Test
    void pressStartsPlaybackWhenStopped() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new PlaybackUpdate(false));

        bus.send(new TopButtonClick(TopButton.MIXER));
        assertNotNull(bus.last(RequestStartPlayback.class));
        assertNull(bus.last(RequestStopPlayback.class));
    }

    @Test
    void pressStopsPlaybackWhilePlaying() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));
        bus.send(new PlaybackUpdate(true));

        bus.send(new TopButtonClick(TopButton.MIXER));
        assertNotNull(bus.last(RequestStopPlayback.class));
        assertNull(bus.last(RequestStartPlayback.class));
    }

    @Test
    void ignoresTransportButtonWhenNotOnTheEditorPage() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);

        bus.send(new TopButtonClick(TopButton.MIXER));
        assertNull(bus.last(RequestStartPlayback.class));
        assertNull(bus.last(RequestStopPlayback.class));
    }

    @Test
    void ignoresOtherTopButtons() {
        FakeEventBus bus = new FakeEventBus();
        new PlaybackHandler(bus);
        bus.send(new PageSelected(EDITOR));

        bus.send(new TopButtonClick(TopButton.SESSION));
        assertNull(bus.last(RequestStartPlayback.class));
        assertNull(bus.last(RequestStopPlayback.class));
    }
}
