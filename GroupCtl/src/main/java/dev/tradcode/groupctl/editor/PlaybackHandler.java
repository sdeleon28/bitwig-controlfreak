package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.PlaybackUpdate;
import dev.tradcode.groupctl.editor.events.RequestStartPlayback;
import dev.tradcode.groupctl.editor.events.RequestStopPlayback;

import dev.tradcode.groupctl.events.BlinkTopButton;
import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

public class PlaybackHandler implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean isPlaying = false;

    public PlaybackHandler(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive)
            return;
        if (this.isPlaying)
            this.bus.send(new BlinkTopButton(TopButton.MIXER, EditorColors.STOP_COLOR));
        else
            this.bus.send(new PaintTopButton(TopButton.MIXER, 0));
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                this.paint();
            }
            case PlaybackUpdate(boolean isPlaying) -> {
                this.isPlaying = isPlaying;
                this.paint();
            }
            case TopButtonClick(var btn) when this.pageActive && btn == TopButton.MIXER -> {
                if (this.isPlaying)
                    this.bus.send(new RequestStopPlayback());
                else
                    this.bus.send(new RequestStartPlayback());
            }
            default -> { }
        }
    }
}
