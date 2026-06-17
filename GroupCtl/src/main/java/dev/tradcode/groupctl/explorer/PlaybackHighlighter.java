package dev.tradcode.groupctl.explorer;

import java.util.ArrayList;
import java.util.List;

/**
 * Marks the block under the playback cursor as playing.
 */
public class PlaybackHighlighter {

    public List<Block> apply(List<Block> blocks, double beat, boolean isPlaying) {
        if (!isPlaying) return blocks;
        List<Block> out = new ArrayList<>(blocks.size());
        for (Block b : blocks) {
            if (!b.empty && beat >= b.startBeat && beat < b.endBeat)
                out.add(b.withPlaying(true));
            else
                out.add(b);
        }
        return out;
    }
}
