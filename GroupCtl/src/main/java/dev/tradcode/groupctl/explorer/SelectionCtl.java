package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import dev.tradcode.groupctl.explorer.events.RequestClearSelection;
import dev.tradcode.groupctl.explorer.events.RequestSetSelection;
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
import dev.tradcode.groupctl.events.SideButtonLongPressed;

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
        this.bus.send(new PaintSideButton(SideButton.RECORD_ARM, color));
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
            return;
        }
        double startBeat = Math.min(this.first.startBeat(), slot.startBeat());
        double endBeat = Math.max(this.first.endBeat(), slot.endBeat());
        this.bus.send(new RequestSetSelection(startBeat, endBeat));
        this.first = null;
        this.setSelecting(false);
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                if (!this.pageActive) {
                    this.selecting = false;
                    this.first = null;
                }
                this.paint();
            }
            case ExplorerGridChanged(var slots) -> this.grid = slots;
            case SideButtonClick(var btn) when this.pageActive && btn == SideButton.RECORD_ARM -> {
                this.first = null;
                this.setSelecting(!this.selecting);
            }
            case SideButtonLongPressed(var btn) when this.pageActive && btn == SideButton.RECORD_ARM -> {
                this.first = null;
                this.selecting = false;
                this.bus.send(new RequestClearSelection());
                this.bus.send(new SelectionModeChanged(false));
                this.paint();
            }
            case PadClicked(int n) when this.pageActive && this.selecting ->
                this.handlePad(n);
            default -> { }
        }
    }
}
