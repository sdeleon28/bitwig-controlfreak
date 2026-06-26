package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.RequestSelectNotes;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadLongPressed;
import dev.tradcode.groupctl.events.PadLongPressStarted;
import dev.tradcode.groupctl.events.PageSelected;

/**
 * Interprets the hold gesture on the editor grid as a temporary Bitwig note
 * selection. Each lit pad held past the long-press threshold joins the
 * selection; releasing it leaves. Several pads can be held at once. The selection
 * itself lives in Bitwig — it drives the red pad feedback ({@link
 * EditorGridPainter}) and the Twister note context ({@link
 * TwisterMidiContextCtl}) — so this class owns no projection of its own beyond
 * the in-flight gesture. Single taps stay with {@link EditorNoteHandler}.
 */
public class PadContextCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean clipExists = false;
    boolean pagerMode = false;
    List<EditorSlot> grid = new ArrayList<>();
    Set<Integer> heldNotes = new LinkedHashSet<>();

    public PadContextCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private EditorSlot slotForNote(int note) {
        int idx = EditorConstants.PADS.indexOf(note);
        if (idx < 0 || idx >= this.grid.size())
            return null;
        return this.grid.get(idx);
    }

    private void hold(int note) {
        EditorSlot slot = this.slotForNote(note);
        if (slot == null || !slot.lit())
            return;
        if (this.heldNotes.add(note))
            this.emitSelection();
    }

    private void release(int note) {
        if (this.heldNotes.remove(note))
            this.emitSelection();
    }

    private void emitSelection() {
        List<NoteCell> cells = new ArrayList<>();
        for (int note : this.heldNotes) {
            EditorSlot s = this.slotForNote(note);
            if (s != null && s.lit())
                cells.add(new NoteCell(s.key(), s.startBeat(), s.endBeat(), s.velocity()));
        }
        this.bus.send(new RequestSelectNotes(cells));
    }

    private void dropHeld() {
        if (this.heldNotes.isEmpty())
            return;
        this.heldNotes.clear();
        this.bus.send(new RequestSelectNotes(List.of()));
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                if (!this.pageActive)
                    this.dropHeld();
            }
            case EditorGridChanged(var slots, var clipExists) -> {
                this.grid = slots;
                this.clipExists = clipExists;
                // Drop any held pad whose note has since gone away and resync the
                // selection so Bitwig matches what is actually held.
                boolean dropped = this.heldNotes.removeIf(note -> {
                    EditorSlot s = this.slotForNote(note);
                    return s == null || !s.lit();
                });
                if (dropped)
                    this.emitSelection();
            }
            case EditorPagerMode(boolean active) -> {
                this.pagerMode = active;
                if (active)
                    this.dropHeld();
            }
            case PadLongPressStarted(int n) when this.pageActive && this.clipExists && !this.pagerMode ->
                this.hold(n);
            case PadLongPressed(int n) when this.pageActive ->
                this.release(n);
            default -> { }
        }
    }
}
