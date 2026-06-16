package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import dev.tradcode.groupctl.explorer.events.RequestSetPlaybackPosition;
import dev.tradcode.groupctl.explorer.events.SelectionModeChanged;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;

public class PlaybackHandler implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean selecting = false;
    List<GridSlot> grid = new ArrayList<>();

    public PlaybackHandler(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> this.pageActive = n == 1;
            case SelectionModeChanged(boolean active) -> this.selecting = active;
            case ExplorerGridChanged(var slots) -> this.grid = slots;
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
