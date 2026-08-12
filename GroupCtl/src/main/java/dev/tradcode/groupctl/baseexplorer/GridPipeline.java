package dev.tradcode.groupctl.baseexplorer;

import dev.tradcode.groupctl.baseexplorer.events.GridSlot;
import java.util.ArrayList;
import java.util.List;

/**
 * The shared reduction from a view's colored source blocks to a paintable
 * 64-pad page: highlight the committed and pending selections, highlight the
 * playhead, merge bars by resolution, then slice to the requested page (clamped
 * to the real page count). Both the normal and setlist reducers run their own
 * source blocks through this so the pipeline stays a single definition.
 */
public class GridPipeline {

    private final SelectionHighlighter selectionHighlighter = new SelectionHighlighter();
    private final PlaybackHighlighter playbackHighlighter = new PlaybackHighlighter();
    private final ResolutionCalculator resolutionCalculator = new ResolutionCalculator();
    private final PageFilter pageFilter = new PageFilter();

    public record Result(List<GridSlot> slots, int totalPages, int page) { }

    public Result reduce(
            List<Block> source,
            boolean selecting,
            double selectionStart, double selectionDuration,
            double pendingStart, double pendingDuration,
            double playbackBeat, boolean isPlaying,
            int barsPerPad, int page) {

        List<Block> blocks = source;
        if (!selecting)
            blocks = this.selectionHighlighter.apply(blocks, selectionStart, selectionDuration);
        blocks = this.selectionHighlighter.apply(blocks, pendingStart, pendingDuration);
        blocks = this.playbackHighlighter.apply(blocks, playbackBeat, isPlaying);
        blocks = this.resolutionCalculator.apply(blocks, barsPerPad);

        int totalPages = Math.max(1,
            (int) Math.ceil(blocks.size() / (double) ExplorerConstants.PAGE_SIZE));
        int clamped = Math.min(Math.max(page, 0), totalPages - 1);

        List<Block> grid = this.pageFilter.apply(blocks, clamped);
        List<GridSlot> slots = new ArrayList<>(grid.size());
        for (Block b : grid)
            slots.add(new GridSlot(b.empty, b.color, b.selected, b.playing, b.startBeat, b.endBeat));

        return new Result(slots, totalPages, clamped);
    }
}
