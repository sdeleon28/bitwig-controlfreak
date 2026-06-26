package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.RequestEditorGridRepaint;
import dev.tradcode.groupctl.editor.events.RequestSelectNotes;
import dev.tradcode.groupctl.editor.events.RequestSetNote;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

/**
 * Turns the side buttons into horizontal row operations. A side button aligns
 * with the grid row at the same height: pressing it selects every note already
 * in that row. When the row is empty there is nothing to select, so the row
 * blinks instead — an invitation to tap any of its pads and fill the whole row
 * at the current resolution, leaving the fresh notes selected. The selection and
 * the notes live in Bitwig; this class owns only the in-flight blink.
 */
public class HorizontalSliceCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean clipExists = false;
    boolean pagerMode = false;
    List<EditorSlot> grid = new ArrayList<>();
    int armedRow = -1;

    public HorizontalSliceCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private List<EditorSlot> rowSlots(int row) {
        int start = row * EditorConstants.GRID_COLS;
        if (start < 0 || start + EditorConstants.GRID_COLS > this.grid.size())
            return List.of();
        return this.grid.subList(start, start + EditorConstants.GRID_COLS);
    }

    private boolean rowHasNotes(int row) {
        for (EditorSlot s : this.rowSlots(row))
            if (s.lit())
                return true;
        return false;
    }

    private void selectRow(int row) {
        List<NoteCell> cells = new ArrayList<>();
        for (EditorSlot s : this.rowSlots(row))
            if (s.lit())
                cells.add(new NoteCell(s.key(), s.startBeat(), s.endBeat(), s.velocity()));
        this.bus.send(new RequestSelectNotes(cells));
    }

    private void armRow(int row) {
        this.armedRow = row;
        int start = row * EditorConstants.GRID_COLS;
        for (int col = 0; col < EditorConstants.GRID_COLS; col++)
            this.bus.send(new BlinkPad(EditorConstants.PADS.get(start + col), EditorColors.SLICE_FILL));
    }

    private void fillRow(int row) {
        this.armedRow = -1;
        List<NoteCell> cells = new ArrayList<>();
        for (EditorSlot s : this.rowSlots(row)) {
            this.bus.send(new RequestSetNote(s.key(), s.startBeat()));
            cells.add(new NoteCell(s.key(), s.startBeat(), s.endBeat(), EditorConstants.VELOCITY));
        }
        this.bus.send(new RequestSelectNotes(cells));
    }

    private void disarm() {
        if (this.armedRow < 0)
            return;
        this.armedRow = -1;
        this.bus.send(new RequestEditorGridRepaint());
    }

    private void handleSideButton(SideButton btn) {
        int row = btn.ordinal();
        if (this.rowHasNotes(row)) {
            this.disarm();
            this.selectRow(row);
        } else if (this.armedRow == row) {
            this.disarm();
        } else {
            this.disarm();
            this.armRow(row);
        }
    }

    private void handlePad(int note) {
        int idx = EditorConstants.PADS.indexOf(note);
        if (idx >= 0 && idx / EditorConstants.GRID_COLS == this.armedRow)
            this.fillRow(this.armedRow);
        else
            this.disarm();
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                this.armedRow = -1;
            }
            case EditorGridChanged(var slots, var clipExists) -> {
                this.grid = slots;
                this.clipExists = clipExists;
            }
            case EditorPagerMode(boolean active) -> {
                this.pagerMode = active;
                if (active)
                    this.armedRow = -1;
            }
            case SideButtonClick(var btn) when this.pageActive && this.clipExists && !this.pagerMode ->
                this.handleSideButton(btn);
            case PadClicked(int n)
                    when this.pageActive && this.clipExists && !this.pagerMode && this.armedRow >= 0 ->
                this.handlePad(n);
            default -> { }
        }
    }
}
