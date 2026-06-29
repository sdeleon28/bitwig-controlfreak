package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.ClearEditorGridCache;
import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysChanged;
import dev.tradcode.groupctl.editor.events.EditorSliceArmed;
import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.RequestEditorGridRepaint;
import dev.tradcode.groupctl.editor.events.RequestSelectNotes;
import dev.tradcode.groupctl.editor.events.RequestSetNotes;
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
 * Turns the side buttons into horizontal row operations spanning the whole clip.
 * A side button aligns with the grid row at the same height: pressing it selects
 * every note already on that row's key, anywhere in the clip — not just the
 * stretch the current page shows. When the key is empty there is nothing to
 * select, so the row blinks instead: tapping any of its pads fills the entire
 * clip on that key at the current resolution and leaves the fresh notes selected.
 * The notes and the selection live in Bitwig; this class owns only the in-flight
 * blink and the clip facts it needs to compute a row.
 */
public class HorizontalSliceCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean clipExists = false;
    boolean pagerMode = false;
    int denominator = EditorConstants.DEFAULT_DENOMINATOR;
    double lengthBeats = EditorConstants.READ_BEATS;
    List<EditorNote> notes = new ArrayList<>();
    int[] rowKeys = null;
    int armedRow = -1;

    public HorizontalSliceCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private int keyForRow(int row) {
        if (this.rowKeys == null || row < 0 || row >= this.rowKeys.length)
            return -1;
        return this.rowKeys[row];
    }

    private boolean keyHasNotes(int key) {
        for (EditorNote n : this.notes)
            if (n.key() == key)
                return true;
        return false;
    }

    private List<NoteCell> notesOnKey(int key) {
        double step = GridGeometry.beatsPerStep(this.denominator);
        List<NoteCell> cells = new ArrayList<>();
        for (EditorNote n : this.notes)
            if (n.key() == key)
                cells.add(new NoteCell(n.key(), n.beat(), n.beat() + step, n.velocity()));
        return cells;
    }

    private List<NoteCell> fillCells(int key) {
        double step = GridGeometry.beatsPerStep(this.denominator);
        double span = Math.min(this.lengthBeats, EditorConstants.READ_BEATS);
        List<NoteCell> cells = new ArrayList<>();
        for (double beat = 0.0; beat < span - 1e-9; beat += step)
            cells.add(new NoteCell(key, beat, beat + step, EditorConstants.VELOCITY));
        return cells;
    }

    private void selectRow(int key) {
        this.bus.send(new RequestSelectNotes(this.notesOnKey(key)));
    }

    // The armed row blinks via the flash MIDI channel, an overlay the grid
    // painter knows nothing about. Announcing arm/disarm lets the calculator stay
    // silent while we own those pads, so a playhead tick can't repaint over them.
    private void setArmed(int row) {
        boolean was = this.armedRow >= 0;
        this.armedRow = row;
        if ((row >= 0) != was)
            this.bus.send(new EditorSliceArmed(row >= 0));
    }

    private void armRow(int row) {
        this.setArmed(row);
        int start = row * EditorConstants.GRID_COLS;
        for (int col = 0; col < EditorConstants.GRID_COLS; col++)
            this.bus.send(new BlinkPad(EditorConstants.PADS.get(start + col), EditorColors.SLICE_FILL));
    }

    private void fillRow(int row) {
        this.setArmed(-1);
        List<NoteCell> cells = this.fillCells(this.keyForRow(row));
        this.bus.send(new RequestSetNotes(cells));
        this.bus.send(new RequestSelectNotes(cells));
    }

    private void disarm() {
        if (this.armedRow < 0)
            return;
        this.setArmed(-1);
        // Clear the cache so the repaint repaints every pad: the blinking pads
        // live on the flash channel, off the painter's radar, and only an
        // unconditional static-colour repaint stops them flashing.
        this.bus.send(new ClearEditorGridCache(), new RequestEditorGridRepaint());
    }

    private void handleSideButton(SideButton btn) {
        int row = btn.ordinal();
        int key = this.keyForRow(row);
        if (key < 0)
            return;
        if (this.keyHasNotes(key)) {
            this.disarm();
            this.selectRow(key);
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
                this.setArmed(-1);
            }
            case EditorClipChanged(boolean exists, double lengthBeats, var notes) -> {
                this.clipExists = exists;
                this.lengthBeats = lengthBeats;
                this.notes = notes;
            }
            case EditorResolutionChanged(int denominator) -> this.denominator = denominator;
            case EditorRowKeysChanged(int[] rowKeys) -> this.rowKeys = rowKeys;
            case EditorPagerMode(boolean active) -> {
                this.pagerMode = active;
                if (active)
                    this.setArmed(-1);
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
