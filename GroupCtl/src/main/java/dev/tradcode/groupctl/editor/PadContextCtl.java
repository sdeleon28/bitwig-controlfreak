package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.RequestEndNoteContext;
import dev.tradcode.groupctl.editor.events.RequestNoteContext;
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
import dev.tradcode.groupctl.events.PaintPad;

/**
 * Interprets the hold gesture on the editor grid. Each lit pad held past the
 * long-press threshold joins the note-attribute context on the Twister
 * ({@link TwisterMidiContextCtl}); releasing it leaves the context. Several pads
 * can be held at once, and each held pad is lit red as feedback that it owns the
 * Twister. Single taps stay with {@link EditorNoteHandler}.
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
        if (this.heldNotes.add(note)) {
            this.bus.send(new PaintPad(note, EditorColors.ACTIVE_CONTEXT));
            this.emitContext();
        }
    }

    private void release(int note) {
        if (!this.heldNotes.remove(note))
            return;
        EditorSlot slot = this.slotForNote(note);
        this.bus.send(new PaintPad(note,
            slot != null && slot.lit() ? EditorColors.NOTE : 0));
        this.emitContext();
    }

    private void emitContext() {
        if (this.heldNotes.isEmpty()) {
            this.bus.send(new RequestEndNoteContext());
            return;
        }
        List<NoteCell> cells = new ArrayList<>();
        for (int note : this.heldNotes) {
            EditorSlot s = this.slotForNote(note);
            if (s != null && s.lit())
                cells.add(new NoteCell(s.key(), s.startBeat(), s.endBeat(), s.velocity()));
        }
        this.bus.send(new RequestNoteContext(cells));
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                if (!this.pageActive)
                    this.heldNotes.clear();
            }
            case EditorGridChanged(var slots, var clipExists) -> {
                this.grid = slots;
                this.clipExists = clipExists;
                // A repaint of the base grid wipes the red feedback, so re-assert
                // it; drop any held pad whose note has since gone away.
                boolean dropped = this.heldNotes.removeIf(note -> {
                    EditorSlot s = this.slotForNote(note);
                    return s == null || !s.lit();
                });
                for (int note : this.heldNotes)
                    this.bus.send(new PaintPad(note, EditorColors.ACTIVE_CONTEXT));
                if (dropped)
                    this.emitContext();
            }
            case EditorPagerMode(boolean active) -> {
                this.pagerMode = active;
                if (active && !this.heldNotes.isEmpty()) {
                    this.heldNotes.clear();
                    this.emitContext();
                }
            }
            case PadLongPressStarted(int n) when this.pageActive && this.clipExists && !this.pagerMode ->
                this.hold(n);
            case PadLongPressed(int n) when this.pageActive ->
                this.release(n);
            default -> { }
        }
    }
}
