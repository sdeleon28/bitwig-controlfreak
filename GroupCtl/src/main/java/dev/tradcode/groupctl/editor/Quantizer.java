package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import java.util.ArrayList;
import java.util.List;

public class Quantizer {

    public List<EditorSlot> apply(List<EditorNote> notes, int denominator, boolean exists, int colOffset) {
        return apply(notes, denominator, exists, colOffset, 0);
    }

    public List<EditorSlot> apply(List<EditorNote> notes, int denominator, boolean exists,
                                  int colOffset, int keyOffset) {
        return apply(notes, denominator, exists, colOffset, keyOffset, -1.0);
    }

    /**
     * {@code playheadBeat} is the clip-relative beat under the play cursor, or a
     * negative value when nothing is playing. The whole column spanning that beat
     * is marked playing so the painter can sweep a vertical cursor across the grid.
     */
    public List<EditorSlot> apply(List<EditorNote> notes, int denominator, boolean exists,
                                  int colOffset, int keyOffset, double playheadBeat) {
        return apply(notes, denominator, exists, colOffset,
            GridGeometry.chromaticRowKeys(keyOffset), playheadBeat);
    }

    /**
     * {@code rowKeys} gives the MIDI key shown on each grid row, top row first.
     * The chromatic editor fills it from {@link GridGeometry}; a drum map (e.g.
     * GGD) supplies its own scattered keys. Quantizing is otherwise identical.
     */
    public List<EditorSlot> apply(List<EditorNote> notes, int denominator, boolean exists,
                                  int colOffset, int[] rowKeys, double playheadBeat) {
        double beatsPerStep = GridGeometry.beatsPerStep(denominator);
        int firstCol = colOffset;
        List<EditorSlot> slots = new ArrayList<>(EditorConstants.PAGE_SIZE);
        for (int row = 0; row < EditorConstants.GRID_ROWS; row++) {
            int key = rowKeys[row];
            for (int col = 0; col < EditorConstants.GRID_COLS; col++) {
                double startBeat = (firstCol + col) * beatsPerStep;
                double endBeat = startBeat + beatsPerStep;
                List<EditorNote> onsets = exists
                    ? onsetsIn(notes, key, startBeat, endBeat)
                    : List.of();
                boolean playing = exists && playheadBeat >= startBeat && playheadBeat < endBeat;
                slots.add(new EditorSlot(
                    !onsets.isEmpty(), key, startBeat, endBeat, velocityOf(onsets), playing));
            }
        }
        return slots;
    }

    /**
     * One onset shows its own velocity; a cell folding several onsets shows full
     * velocity, so a turn there rewrites them all from a known baseline.
     */
    private static double velocityOf(List<EditorNote> onsets) {
        if (onsets.isEmpty())
            return 0.0;
        if (onsets.size() == 1)
            return onsets.get(0).velocity();
        return 1.0;
    }

    private static List<EditorNote> onsetsIn(List<EditorNote> notes, int key,
                                             double startBeat, double endBeat) {
        List<EditorNote> onsets = new ArrayList<>();
        if (notes == null)
            return onsets;
        for (EditorNote n : notes)
            if (n.key() == key && n.beat() >= startBeat && n.beat() < endBeat)
                onsets.add(n);
        return onsets;
    }
}
