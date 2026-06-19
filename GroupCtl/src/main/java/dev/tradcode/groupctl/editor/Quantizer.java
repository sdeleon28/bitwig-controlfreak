package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import java.util.ArrayList;
import java.util.List;

public class Quantizer {

    public List<EditorSlot> apply(List<EditorNote> notes, int denominator, boolean exists, int page) {
        double beatsPerStep = GridGeometry.beatsPerStep(denominator);
        int firstCol = page * EditorConstants.GRID_COLS;
        List<EditorSlot> slots = new ArrayList<>(EditorConstants.PAGE_SIZE);
        for (int row = 0; row < EditorConstants.GRID_ROWS; row++) {
            int key = GridGeometry.keyForRow(row);
            for (int col = 0; col < EditorConstants.GRID_COLS; col++) {
                double startBeat = (firstCol + col) * beatsPerStep;
                double endBeat = startBeat + beatsPerStep;
                List<EditorNote> onsets = exists
                    ? onsetsIn(notes, key, startBeat, endBeat)
                    : List.of();
                slots.add(new EditorSlot(
                    !onsets.isEmpty(), key, startBeat, endBeat, velocityOf(onsets)));
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
