package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import dev.tradcode.groupctl.explorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.explorer.events.RequestSetPlaybackPosition;
import dev.tradcode.groupctl.explorer.events.RequestStopPlayback;
import dev.tradcode.groupctl.explorer.events.SelectionModeChanged;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

public class PlaybackHandler implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean selecting = false;
    boolean isPlaying = false;
    List<GridSlot> grid = new ArrayList<>();

    public PlaybackHandler(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive) return;
        this.bus.send(
            new PaintSideButton(
                SideButton.STOP,
                this.isPlaying ? ExplorerColors.STOP_COLOR : 0
            )
        );
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                this.paint();
            }
            case SelectionModeChanged(boolean active) -> this.selecting = active;
            case ExplorerGridChanged(var slots, int totalPages, int page) -> this.grid = slots;
            case SideButtonClick(var btn) when this.pageActive && btn == SideButton.STOP ->
                this.bus.send(new RequestStopPlayback());
            case PlaybackUpdate(double beat, boolean isPlaying) -> {
                this.isPlaying = isPlaying;
                this.paint();
            }
            case PadClicked(int n) when this.pageActive && !this.selecting -> {
                int idx = ExplorerConstants.PADS.indexOf(n);
                if (idx >= 0 && idx < this.grid.size()) {
                    GridSlot slot = this.grid.get(idx);
                    if (!slot.empty())
                        this.bus.send(new RequestSetPlaybackPosition(slot.startBeat()));
                }
            }
            default -> { }
        }
    }
}
