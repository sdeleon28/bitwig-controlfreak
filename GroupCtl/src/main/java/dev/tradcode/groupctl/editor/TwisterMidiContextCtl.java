package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.RequestEndNoteContext;
import dev.tradcode.groupctl.editor.events.RequestNoteContext;
import dev.tradcode.groupctl.editor.events.RequestSetVelocity;
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
 * more note cells are held on the editor grid it owns one encoder per editable
 * attribute and writes that attribute back to every held cell. Only the active
 * program paints or reacts to turns, so it never fights the editor's other
 * surfaces.
 */
public class TwisterMidiContextCtl implements IEventBusSubscriber {
    static final int VELOCITY_ENCODER = 1;

    IEventBus bus;
    boolean active = false;
    boolean pageActive = false;
    List<NoteCell> cells = List.of();

    public TwisterMidiContextCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private double displayVelocity() {
        return this.cells.size() == 1 ? this.cells.get(0).velocity() : 1.0;
    }

    private void paintVelocity() {
        this.bus.send(
            new PaintEncoder(VELOCITY_ENCODER, EditorColors.VELOCITY_ENCODER_COLOR),
            new SetEncoderValue(VELOCITY_ENCODER, (int) Math.round(this.displayVelocity() * 127))
        );
    }

    private void deactivate() {
        if (!this.active)
            return;
        this.active = false;
        this.cells = List.of();
        this.bus.send(
            new PaintEncoder(VELOCITY_ENCODER, 0),
            new SetEncoderValue(VELOCITY_ENCODER, 0)
        );
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                if (!this.pageActive) {
                    this.active = false;
                    this.cells = List.of();
                }
            }
            case RequestNoteContext(var cells) when this.pageActive -> {
                if (cells.isEmpty()) {
                    this.deactivate();
                    return;
                }
                this.active = true;
                this.cells = cells;
                this.paintVelocity();
            }
            case RequestEndNoteContext() -> this.deactivate();
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
