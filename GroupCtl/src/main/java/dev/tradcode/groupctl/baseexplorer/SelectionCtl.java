package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import dev.tradcode.groupctl.explorer.events.PendingSelectionChanged;
import dev.tradcode.groupctl.explorer.events.RequestSetSelection;
import dev.tradcode.groupctl.explorer.events.SelectionModeChanged;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

public class SelectionCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean selecting = false;
    GridSlot first = null;
    List<GridSlot> grid = new ArrayList<>();

    public SelectionCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void setSelecting(boolean s) {
        this.selecting = s;
        this.bus.send(new SelectionModeChanged(s));
        this.paint();
    }

    private void paint() {
        int color;
        if (!this.pageActive)
            color = 0;
        else if (this.selecting)
            color = ExplorerColors.WHITE;
        else
            color = ExplorerColors.SELECT_COLOR;
        this.bus.send(new PaintTopButton(TopButton.MIXER, color));
    }

    private void clearGesture() {
        if (this.first == null)
            return;
        this.first = null;
        this.bus.send(new PendingSelectionChanged(0, 0));
    }

    private void handlePad(int note) {
        int idx = ExplorerConstants.PADS.indexOf(note);
        if (idx < 0 || idx >= this.grid.size())
            return;
        GridSlot slot = this.grid.get(idx);
        if (slot.empty())
            return;

        if (this.first == null) {
            this.first = slot;
            // Light the anchor pad so the user sees the gesture has begun.
            this.bus.send(new PendingSelectionChanged(
                slot.startBeat(), slot.endBeat() - slot.startBeat()));
            return;
        }
        double startBeat = Math.min(this.first.startBeat(), slot.startBeat());
        double endBeat = Math.max(this.first.endBeat(), slot.endBeat());
        this.clearGesture();
        this.bus.send(new RequestSetSelection(startBeat, endBeat));
        this.setSelecting(false);
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                if (!this.pageActive) {
                    this.selecting = false;
                    this.clearGesture();
                }
                this.paint();
            }
            case ExplorerGridChanged(var slots, int totalPages, int page) ->
                this.grid = slots;
            case TopButtonClick(var btn)
            when this.pageActive && btn == TopButton.MIXER -> {
                this.clearGesture();
                this.setSelecting(!this.selecting);
            }
            case PadClicked(int n) when this.pageActive && this.selecting ->
                this.handlePad(n);
            default -> { }
        }
    }
}
