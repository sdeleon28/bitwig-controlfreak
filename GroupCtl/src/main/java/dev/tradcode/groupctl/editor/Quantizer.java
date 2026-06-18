package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import java.util.ArrayList;
import java.util.List;

public class Quantizer {

    public List<EditorSlot> apply(List<EditorNote> notes, int denominator, boolean exists, int page) {
        double beatsPerStep = EditorConstants.beatsPerStep(denominator);
        int firstCol = page * EditorConstants.GRID_COLS;
        List<EditorSlot> slots = new ArrayList<>(EditorConstants.PAGE_SIZE);
        for (int row = 0; row < EditorConstants.GRID_ROWS; row++) {
            int key = EditorConstants.keyForRow(row);
            for (int col = 0; col < EditorConstants.GRID_COLS; col++) {
                double startBeat = (firstCol + col) * beatsPerStep;
                double endBeat = startBeat + beatsPerStep;
                boolean lit = exists && hasOnset(notes, key, startBeat, endBeat);
                slots.add(new EditorSlot(lit, key, startBeat, endBeat));
            }
        }
        return slots;
    }

    private static boolean hasOnset(List<EditorNote> notes, int key,
                                    double startBeat, double endBeat) {
        if (notes == null)
            return false;
        for (EditorNote n : notes)
            if (n.key() == key && n.beat() >= startBeat && n.beat() < endBeat)
                return true;
        return false;
    }
}
