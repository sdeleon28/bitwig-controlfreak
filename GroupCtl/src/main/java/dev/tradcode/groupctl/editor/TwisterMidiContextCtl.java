package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.RequestSetVelocity;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;

/**
 * Twister program mirroring the mixmachine track-encoder programs: while one or
 * more notes are selected in Bitwig it owns one encoder per editable attribute
 * and writes that attribute back to every selected cell. The selection is read
 * from the grid broadcast ({@link EditorGridChanged}), so Bitwig's note
 * selection — not a held-pad list — is the source of truth. Only the active
 * program paints or reacts to turns, so it never fights the editor's other
 * surfaces.
 */
public class TwisterMidiContextCtl implements IEventBusSubscriber {
    static final int VELOCITY_ENCODER = 1;

    IEventBus bus;
    boolean active = false;
    boolean pageActive = false;
    boolean pagerMode = false;
    List<NoteCell> cells = List.of();
    // The selection's identity (which cells, not their values). The grid
    // re-broadcasts on every playhead tick and on every velocity round-trip; we
    // only re-arm the ring when the selected set actually changes, so a turn is
    // never snapped back under the user's fingers.
    String armedSignature = null;

    public TwisterMidiContextCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private double displayVelocity() {
        return this.cells.size() == 1 ? this.cells.get(0).velocity() : 1.0;
    }

    private static String signatureOf(List<NoteCell> cells) {
        StringBuilder sb = new StringBuilder();
        for (NoteCell c : cells)
            sb.append(c.key()).append('@').append(c.startBeat()).append(';');
        return sb.toString();
    }

    private void onGrid(List<EditorSlot> slots) {
        List<NoteCell> selected = new ArrayList<>();
        for (EditorSlot s : slots)
            if (s.selected())
                selected.add(new NoteCell(s.key(), s.startBeat(), s.endBeat(), s.velocity()));
        if (selected.isEmpty())
            this.deactivate();
        else
            this.arm(selected);
    }

    private void arm(List<NoteCell> selected) {
        this.cells = selected;
        String sig = signatureOf(selected);
        if (sig.equals(this.armedSignature))
            return;
        this.armedSignature = sig;
        if (!this.active) {
            this.active = true;
            this.bus.send(new PaintEncoder(VELOCITY_ENCODER, EditorColors.VELOCITY_ENCODER_COLOR));
        }
        this.bus.send(new SetEncoderValue(
            VELOCITY_ENCODER, (int) Math.round(this.displayVelocity() * 127)));
    }

    private void deactivate() {
        if (!this.active)
            return;
        this.active = false;
        this.cells = List.of();
        this.armedSignature = null;
        this.bus.send(
            new PaintEncoder(VELOCITY_ENCODER, 0),
            new SetEncoderValue(VELOCITY_ENCODER, 0)
        );
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                if (!this.pageActive)
                    this.deactivate();
            }
            case EditorPagerMode(boolean active) -> {
                this.pagerMode = active;
                if (active)
                    this.deactivate();
            }
            case EditorGridChanged(var slots, var exists) when this.pageActive && !this.pagerMode ->
                this.onGrid(slots);
            case EncoderTurned(int n, int v) when this.active && n == VELOCITY_ENCODER -> {
                double velocity = ((double) v) / 127.0;
                for (NoteCell cell : this.cells)
                    this.bus.send(new RequestSetVelocity(
                        cell.key(), cell.startBeat(), cell.endBeat(), velocity));
            }
            default -> { }
        }
    }
}
