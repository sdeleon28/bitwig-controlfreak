package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.RequestClearNotes;
import dev.tradcode.groupctl.editor.events.RequestSetNote;
import dev.tradcode.groupctl.editor.events.RequestSetVelocity;
import java.util.ArrayList;
import java.util.List;

import com.bitwig.extension.controller.api.Clip;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.NoteStep;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

public class BitwigEditorClipTracker implements IEventBusSubscriber {
    ControllerHost host;
    IEventBus bus;
    Clip clip;
    boolean[][] onsets = new boolean[EditorConstants.READ_STEPS][EditorConstants.GRID_ROWS];
    double[][] velocities = new double[EditorConstants.READ_STEPS][EditorConstants.GRID_ROWS];
    boolean exists = false;
    double lengthBeats = EditorConstants.READ_BEATS;
    boolean dirty = false;

    protected BitwigEditorClipTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.host = host;
        this.bus.subscribe(this);
        // escape hatch for testing without major refactor
        if (host == null)
            return;
        this.clip = host.createArrangerCursorClip(
            EditorConstants.READ_STEPS, EditorConstants.GRID_ROWS);
        this.clip.setStepSize(EditorConstants.FINE_STEP_BEATS);
        this.clip.scrollToKey(EditorConstants.BASE_KEY);
        this.clip.exists().addValueObserver(v -> {
            this.exists = v;
            this.dirty = true;
        });
        this.clip.getLoopLength().addValueObserver(v -> {
            this.lengthBeats = v;
            this.dirty = true;
        });
        this.clip.addNoteStepObserver(ns -> {
            int x = ns.x();
            int y = ns.y();
            if (x < 0 || x >= EditorConstants.READ_STEPS
                || y < 0 || y >= EditorConstants.GRID_ROWS)
                return;
            // Only onsets light a pad; sustained continuations are ignored
            // (note lengths don't matter for percussion).
            this.onsets[x][y] = ns.state() == NoteStep.State.NoteOn;
            this.velocities[x][y] = ns.velocity();
            this.dirty = true;
        });
    }

    private static int stepFor(double beat) {
        return (int) Math.round(beat / EditorConstants.FINE_STEP_BEATS);
    }

    public void on(Event event) {
        switch (event) {
            case RequestSetNote(int key, double beat) when this.clip != null -> {
                int x = stepFor(beat);
                int y = key - EditorConstants.BASE_KEY;
                if (x >= 0 && x < EditorConstants.READ_STEPS
                    && y >= 0 && y < EditorConstants.GRID_ROWS)
                    this.clip.setStep(EditorConstants.CHANNEL, x, y,
                        EditorConstants.VELOCITY, EditorConstants.FINE_STEP_BEATS);
            }
            case RequestClearNotes(int key, double startBeat, double endBeat)
            when this.clip != null -> {
                int y = key - EditorConstants.BASE_KEY;
                if (y < 0 || y >= EditorConstants.GRID_ROWS)
                    return;
                int from = stepFor(startBeat);
                int to = stepFor(endBeat);
                for (int x = from; x < to; x++)
                    if (x >= 0 && x < EditorConstants.READ_STEPS)
                        this.clip.clearStep(EditorConstants.CHANNEL, x, y);
            }
            case RequestSetVelocity(int key, double startBeat, double endBeat, double velocity)
            when this.clip != null -> {
                int y = key - EditorConstants.BASE_KEY;
                if (y < 0 || y >= EditorConstants.GRID_ROWS)
                    return;
                int from = stepFor(startBeat);
                int to = stepFor(endBeat);
                // Re-assert the note via setStep (the same write note creation uses)
                // rather than editing the NoteStep in place: setStep round-trips
                // through the note-step observer, so our velocity cache is
                // refreshed by Bitwig instead of guessed at on our side.
                int insertVelocity = (int) Math.round(velocity * 127);
                for (int x = from; x < to; x++)
                    if (x >= 0 && x < EditorConstants.READ_STEPS && this.onsets[x][y])
                        this.clip.setStep(EditorConstants.CHANNEL, x, y,
                            insertVelocity, EditorConstants.FINE_STEP_BEATS);
            }
            default -> { }
        }
    }

    public void flush() {
        if (!this.dirty)
            return;
        List<EditorNote> notes = new ArrayList<>();
        for (int x = 0; x < EditorConstants.READ_STEPS; x++)
            for (int y = 0; y < EditorConstants.GRID_ROWS; y++)
                if (this.onsets[x][y])
                    notes.add(new EditorNote(
                        EditorConstants.BASE_KEY + y,
                        x * EditorConstants.FINE_STEP_BEATS,
                        this.velocities[x][y]));
        this.bus.send(new EditorClipChanged(this.exists, this.lengthBeats, notes));
        this.dirty = false;
    }
}
