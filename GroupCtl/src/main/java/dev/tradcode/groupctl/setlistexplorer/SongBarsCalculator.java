package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.Block;
import dev.tradcode.groupctl.baseexplorer.ExplorerConstants;
import dev.tradcode.groupctl.baseexplorer.Song;
import dev.tradcode.groupctl.baseexplorer.SongParser;
import dev.tradcode.groupctl.baseexplorer.events.Marker;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.Colors;

/**
 * Lays a single song onto one-bar blocks: from the song's opening beat up to its
 * closing beat, each bar colored by the section marker active at that bar. The
 * closing {@code }} marker only bounds the span; it never paints a bar. The last
 * bar is clamped to the closer so the blocks cover exactly the song.
 */
public class SongBarsCalculator {

    public List<Block> apply(Song song) {
        List<Block> blocks = new ArrayList<>();
        if (song == null)
            return blocks;

        List<Marker> sections = new ArrayList<>();
        for (Marker m : song.markers())
            if (!SongParser.isCloser(m.name()))
                sections.add(m);
        if (sections.isEmpty())
            return blocks;
        sections.sort((a, b) -> Double.compare(a.position(), b.position()));

        double end = song.endBeat();
        double beat = sections.get(0).position();
        int idx = 0;
        while (beat < end) {
            while (idx + 1 < sections.size() && sections.get(idx + 1).position() <= beat)
                idx++;
            int color = Colors.toLaunchpad(sections.get(idx).color());
            double barEnd = Math.min(beat + ExplorerConstants.BEATS_PER_BAR, end);
            blocks.add(Block.bar(color, beat, barEnd));
            beat += ExplorerConstants.BEATS_PER_BAR;
        }
        return blocks;
    }
}
