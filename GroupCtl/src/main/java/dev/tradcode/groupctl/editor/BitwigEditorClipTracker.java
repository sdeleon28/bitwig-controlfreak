package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorClipTrackChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorPlaybackPosition;
import dev.tradcode.groupctl.editor.events.NoteCell;
import dev.tradcode.groupctl.editor.events.PlaybackUpdate;
import dev.tradcode.groupctl.editor.events.RequestClearNotes;
import dev.tradcode.groupctl.editor.events.RequestSelectNotes;
import dev.tradcode.groupctl.editor.events.RequestSetNote;
import dev.tradcode.groupctl.editor.events.RequestSetNotes;
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
    boolean[][] onsets = new boolean[EditorConstants.READ_STEPS][EditorConstants.READ_KEY_RANGE];
    double[][] velocities = new double[EditorConstants.READ_STEPS][EditorConstants.READ_KEY_RANGE];
    boolean[][] selected = new boolean[EditorConstants.READ_STEPS][EditorConstants.READ_KEY_RANGE];
    boolean exists = false;
    double lengthBeats = EditorConstants.READ_BEATS;
    boolean dirty = false;
    int playingStep = -1;
    boolean playheadDirty = false;
    boolean isPlaying = false;
    String trackName = "";
    boolean trackDirty = false;

    protected BitwigEditorClipTracker(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.host = host;
        this.bus.subscribe(this);
        // escape hatch for testing without major refactor
        if (host == null)
            return;
        this.clip = host.createArrangerCursorClip(
            EditorConstants.READ_STEPS, EditorConstants.READ_KEY_RANGE);
        this.clip.setStepSize(EditorConstants.FINE_STEP_BEATS);
        this.clip.scrollToKey(EditorConstants.BASE_KEY);
        this.clip.getTrack().name().addValueObserver(name -> {
            this.trackName = name;
            this.trackDirty = true;
        });
        this.clip.exists().addValueObserver(v -> {
            this.exists = v;
            this.dirty = true;
        });
        this.clip.getPlayStop().addValueObserver(v -> {
            this.lengthBeats = v;
            this.dirty = true;
        });
        this.clip.addNoteStepObserver(ns -> {
            int x = ns.x();
            int y = ns.y();
            if (x < 0 || x >= EditorConstants.READ_STEPS
                || y < 0 || y >= EditorConstants.READ_KEY_RANGE)
                return;
            // Only onsets light a pad; sustained continuations are ignored
            // (note lengths don't matter for percussion).
            this.onsets[x][y] = ns.state() == NoteStep.State.NoteOn;
            this.velocities[x][y] = ns.velocity();
            // Bitwig's note selection is the source of truth for the Twister
            // context and the red pad feedback; the step observer re-fires when a
            // note's selection flips, so we just mirror it here.
            this.selected[x][y] = ns.isIsSelected();
            this.dirty = true;
        });
        this.clip.playingStep().addValueObserver(v -> {
            this.playingStep = v;
            this.playheadDirty = true;
        });
    }

    private static int stepFor(double beat) {
        return (int) Math.round(beat / EditorConstants.FINE_STEP_BEATS);
    }

    private void applySelection(List<NoteCell> cells) {
        if (cells.isEmpty()) {
            this.clearSelection();
            return;
        }
        boolean clearFirst = true;
        for (NoteCell cell : cells) {
            int x = stepFor(cell.startBeat());
            int y = cell.key() - EditorConstants.BASE_KEY;
            if (x < 0 || x >= EditorConstants.READ_STEPS
                || y < 0 || y >= EditorConstants.READ_KEY_RANGE)
                continue;
            this.clip.selectStepContents(EditorConstants.CHANNEL, x, y, clearFirst);
            clearFirst = false;
        }
    }

    private void clearSelection() {
        for (int x = 0; x < EditorConstants.READ_STEPS; x++)
            for (int y = 0; y < EditorConstants.READ_KEY_RANGE; y++)
                if (!this.onsets[x][y]) {
                    this.clip.selectStepContents(EditorConstants.CHANNEL, x, y, true);
                    return;
                }
    }

    public void on(Event event) {
        switch (event) {
            case PlaybackUpdate(boolean playing) -> this.isPlaying = playing;
            case RequestSetNote(int key, double beat) when this.clip != null -> {
                int x = stepFor(beat);
                int y = key - EditorConstants.BASE_KEY;
                if (x >= 0 && x < EditorConstants.READ_STEPS
                    && y >= 0 && y < EditorConstants.READ_KEY_RANGE) {
                    this.clip.setStep(EditorConstants.CHANNEL, x, y,
                        EditorConstants.VELOCITY, EditorConstants.FINE_STEP_BEATS);
                    // Audition the note the moment it lands, but only when the
                    // transport is idle — during playback the clip already sounds it.
                    if (!this.isPlaying)
                        this.clip.getTrack().playNote(key, EditorConstants.VELOCITY);
                }
            }
            case RequestClearNotes(int key, double startBeat, double endBeat)
            when this.clip != null -> {
                int y = key - EditorConstants.BASE_KEY;
                if (y < 0 || y >= EditorConstants.READ_KEY_RANGE)
                    return;
                int from = stepFor(startBeat);
                int to = stepFor(endBeat);
                for (int x = from; x < to; x++)
                    if (x >= 0 && x < EditorConstants.READ_STEPS)
                        this.clip.clearStep(EditorConstants.CHANNEL, x, y);
            }
            case RequestSetNotes(var cells) when this.clip != null -> {
                boolean auditioned = false;
                for (NoteCell cell : cells) {
                    int x = stepFor(cell.startBeat());
                    int y = cell.key() - EditorConstants.BASE_KEY;
                    if (x < 0 || x >= EditorConstants.READ_STEPS
                        || y < 0 || y >= EditorConstants.READ_KEY_RANGE)
                        continue;
                    this.clip.setStep(EditorConstants.CHANNEL, x, y,
                        EditorConstants.VELOCITY, EditorConstants.FINE_STEP_BEATS);
                    // One audition for the whole stroke; a per-note playNote would
                    // stack dozens of voices on the same key.
                    if (!this.isPlaying && !auditioned) {
                        this.clip.getTrack().playNote(cell.key(), EditorConstants.VELOCITY);
                        auditioned = true;
                    }
                }
            }
            case RequestSelectNotes(var cells) when this.clip != null -> this.applySelection(cells);
            case RequestSetVelocity(int key, double startBeat, double endBeat, double velocity)
            when this.clip != null -> {
                int y = key - EditorConstants.BASE_KEY;
                if (y < 0 || y >= EditorConstants.READ_KEY_RANGE)
                    return;
                int from = stepFor(startBeat);
                int to = stepFor(endBeat);
                for (int x = from; x < to; x++)
                    if (x >= 0 && x < EditorConstants.READ_STEPS && this.onsets[x][y]) {
                        NoteStep step = this.clip.getStep(EditorConstants.CHANNEL, x, y);
                        if (step.state() == NoteStep.State.NoteOn)
                            step.setVelocity(velocity);
                    }
            }
            default -> { }
        }
    }

    public void flush() {
        // Publish the track name before the clip geometry so whichever mapper it
        // selects has settled its row keys by the time the notes arrive.
        if (this.trackDirty) {
            this.bus.send(new EditorClipTrackChanged(this.trackName));
            this.trackDirty = false;
        }
        // The playhead ticks far more often than the notes change; keep it on its
        // own dirty flag so a moving cursor never republishes the clip geometry.
        if (this.playheadDirty) {
            this.bus.send(new EditorPlaybackPosition(
                this.playingStep >= 0 ? this.playingStep * EditorConstants.FINE_STEP_BEATS : -1.0));
            this.playheadDirty = false;
        }
        if (!this.dirty)
            return;
        List<EditorNote> notes = new ArrayList<>();
        for (int x = 0; x < EditorConstants.READ_STEPS; x++)
            for (int y = 0; y < EditorConstants.READ_KEY_RANGE; y++)
                if (this.onsets[x][y])
                    notes.add(new EditorNote(
                        EditorConstants.BASE_KEY + y,
                        x * EditorConstants.FINE_STEP_BEATS,
                        this.velocities[x][y],
                        this.selected[x][y]));
        this.bus.send(new EditorClipChanged(this.exists, this.lengthBeats, notes));
        this.dirty = false;
    }
}
