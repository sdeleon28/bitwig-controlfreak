package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestToggleNoteSelection;
import dev.tradcode.groupctl.editor.events.SelectionModeChanged;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

/**
 * Owns the MIXER top button across both editor pages as a selection-mode toggle,
 * mirroring the explorer's {@code SelectionCtl}. While the mode is engaged a pad
 * tap toggles that single note's Bitwig selection — additively, so several notes
 * can be gathered one tap at a time. Bitwig's selection stays the source of
 * truth: this class never projects which notes are selected, it only asks the
 * clip tracker to flip one (the tracker rebuilds the whole selection, preserving
 * notes on the other vertical page). While the mode is engaged {@link
 * EditorNoteHandler} stands down so taps select rather than add or erase notes.
 */
public class EditorSelectionCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean pagerMode = false;
    boolean selecting = false;
    List<EditorSlot> grid = new ArrayList<>();

    public EditorSelectionCtl(IEventBus bus) {
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
            color = EditorColors.SELECT_ACTIVE;
        else
            color = EditorColors.SELECT_IDLE;
        this.bus.send(new PaintTopButton(TopButton.MIXER, color));
    }

    private void handlePad(int note) {
        int idx = EditorConstants.PADS.indexOf(note);
        if (idx < 0 || idx >= this.grid.size())
            return;
        EditorSlot slot = this.grid.get(idx);
        if (!slot.lit())
            return;
        this.bus.send(new RequestToggleNoteSelection(
            slot.key(), slot.startBeat(), slot.endBeat()));
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                if (!this.pageActive && this.selecting)
                    this.setSelecting(false);
                else
                    this.paint();
            }
            case EditorGridChanged(var slots, var exists) -> this.grid = slots;
            case EditorPagerMode(boolean active) -> this.pagerMode = active;
            case TopButtonClick(var btn)
            when this.pageActive && !this.pagerMode && btn == TopButton.MIXER ->
                this.setSelecting(!this.selecting);
            case PadClicked(int n)
            when this.pageActive && this.selecting && !this.pagerMode ->
                this.handlePad(n);
            default -> { }
        }
    }
}
