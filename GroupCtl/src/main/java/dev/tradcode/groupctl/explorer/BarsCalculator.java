package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.Marker;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.Colors;

/**
 * Turns marker metadata into the project's timeline as a list of one-bar blocks,
 * each colored by the marker active at that bar. Stateless: it is the source of
 * the paint pipeline.
 *
 * <p>The timeline runs from the first marker to one bar past the last marker, so
 * the final section is always visible.
 */
public class BarsCalculator {

    public List<Block> apply(List<Marker> markers) {
        List<Block> blocks = new ArrayList<>();
        if (markers == null || markers.isEmpty())
            return blocks;

        List<Marker> sorted = new ArrayList<>(markers);
        sorted.sort((a, b) -> Double.compare(a.position(), b.position()));

        double first = sorted.get(0).position();
        double last = sorted.get(sorted.size() - 1).position();
        double contentEnd = last + ExplorerConstants.BEATS_PER_BAR;

        double beat = first;
        int markerIdx = 0;
        while (beat < contentEnd) {
            // Advance to the last marker that starts at or before this bar.
            while (markerIdx + 1 < sorted.size()
                    && sorted.get(markerIdx + 1).position() <= beat) {
                markerIdx++;
            }
            int color = Colors.toLaunchpad(sorted.get(markerIdx).color());
            double end = beat + ExplorerConstants.BEATS_PER_BAR;
            blocks.add(Block.bar(color, beat, end));
            beat = end;
        }
        return blocks;
    }
}
