package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.PlaybackUpdate;
import dev.tradcode.groupctl.editor.events.RequestEditorSideRepaint;
import dev.tradcode.groupctl.editor.events.RequestStartPlayback;
import dev.tradcode.groupctl.editor.events.RequestStopPlayback;

import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

public class PlaybackHandler implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean isPlaying = false;
    boolean mode = false;

    public PlaybackHandler(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive)
            return;
        if (this.isPlaying)
            this.bus.send(new BlinkPad(SideButton.STOP.getValue(), EditorColors.STOP_COLOR));
        else
            this.bus.send(new PaintSideButton(SideButton.STOP, 0));
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                this.mode = false;
                this.paint();
            }
            case PlaybackUpdate(boolean isPlaying) -> {
                this.isPlaying = isPlaying;
                if (!this.mode)
                    this.paint();
            }
            case EditorPagerMode(boolean active) -> this.mode = active;
            case RequestEditorSideRepaint() -> this.paint();
            case SideButtonClick(var btn) when this.pageActive && !this.mode && btn == SideButton.STOP -> {
                if (this.isPlaying)
                    this.bus.send(new RequestStopPlayback());
                else
                    this.bus.send(new RequestStartPlayback());
            }
            default -> { }
        }
    }
}
