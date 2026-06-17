package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.BitwigSelectionChanged;
import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import dev.tradcode.groupctl.explorer.events.Marker;
import dev.tradcode.groupctl.explorer.events.MarkersChanged;
import dev.tradcode.groupctl.explorer.events.PlaybackPositionChanged;
import dev.tradcode.groupctl.explorer.events.RequestExplorerPage;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.ResolutionChanged;

public class GridCalculator implements IEventBusSubscriber {
    IEventBus bus;

    final BarsCalculator barsCalculator = new BarsCalculator();
    final SelectionHighlighter selectionHighlighter = new SelectionHighlighter();
    final PlaybackHighlighter playbackHighlighter = new PlaybackHighlighter();
    final ResolutionCalculator resolutionCalculator = new ResolutionCalculator();
    final PageFilter pageFilter = new PageFilter();

    List<Marker> markers = new ArrayList<>();
    double selectionStart = 0;
    double selectionDuration = 0;
    double playbackBeat = 0;
    boolean hasPlayback = false;
    int barsPerPad = 1;
    int page = 0;
    boolean pageActive = false;

    public GridCalculator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void recompute() {
        if (!this.pageActive)
            return;

        List<Block> blocks = this.barsCalculator.apply(this.markers);
        blocks = this.selectionHighlighter.apply(blocks, this.selectionStart, this.selectionDuration);
        blocks = this.playbackHighlighter.apply(blocks, this.playbackBeat, this.hasPlayback);
        blocks = this.resolutionCalculator.apply(blocks, this.barsPerPad);

        int totalPages = Math.max(1,
            (int) Math.ceil(blocks.size() / (double) ExplorerConstants.PAGE_SIZE));

        this.page = Math.min(Math.max(this.page, 0), totalPages - 1);

        List<Block> grid = this.pageFilter.apply(blocks, this.page);
        List<GridSlot> slots = new ArrayList<>(grid.size());
        for (Block b : grid)
            slots.add(new GridSlot(b.empty, b.color, b.selected, b.playing, b.startBeat, b.endBeat));

        this.bus.send(new ExplorerGridChanged(slots, totalPages, this.page));
    }

    public void on(Event event) {
        switch (event) {
            case MarkersChanged(var m) -> {
                this.markers = m;
                this.recompute();
            }
            case BitwigSelectionChanged(double start, double duration) -> {
                this.selectionStart = start;
                this.selectionDuration = duration;
                this.recompute();
            }
            case PlaybackPositionChanged(double beat) -> {
                this.playbackBeat = beat;
                this.hasPlayback = true;
                this.recompute();
            }
            case ResolutionChanged(int bpp) -> {
                this.barsPerPad = bpp;
                this.recompute();
            }
            case RequestExplorerPage(int delta) -> {
                this.page += delta;
                this.recompute();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                this.recompute();
            }
            default -> { }
        }
    }
}
