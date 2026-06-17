package dev.tradcode.groupctl.explorer;

import java.util.ArrayList;
import java.util.List;

/**
 * Down-scales the one-bar blocks by merging up to {@code barsPerPad} adjacent
 * same-color bars into a single block. 
 */
public class ResolutionCalculator {

    public List<Block> apply(List<Block> blocks, int barsPerPad) {
        List<Block> out = new ArrayList<>();
        int n = blocks.size();
        int i = 0;
        while (i < n) {
            Block head = blocks.get(i);
            int color = head.color;
            double startBeat = head.startBeat;
            double endBeat = head.endBeat;
            boolean selected = head.selected;
            boolean playing = head.playing;

            int count = 1;
            int j = i + 1;
            while (j < n && count < barsPerPad && blocks.get(j).color == color) {
                Block b = blocks.get(j);
                endBeat = b.endBeat;
                selected = selected || b.selected;
                playing = playing || b.playing;
                count++;
                j++;
            }
            out.add(new Block(color, startBeat, endBeat, selected, playing, false));
            i = j;
        }
        return out;
    }
}
