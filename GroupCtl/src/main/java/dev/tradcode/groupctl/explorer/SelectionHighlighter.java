package dev.tradcode.groupctl.explorer;

import java.util.ArrayList;
import java.util.List;

/**
 * Marks blocks overlapping the time selection as selected.
 */
public class SelectionHighlighter {

    public List<Block> apply(List<Block> blocks, double start, double duration) {
        if (duration <= 0)
            return blocks;
        double end = start + duration;
        List<Block> out = new ArrayList<>(blocks.size());
        for (Block b : blocks) {
            if (!b.empty && b.startBeat < end && b.endBeat > start)
                out.add(b.withSelected(true));
            else
                out.add(b);
        }
        return out;
    }
}
