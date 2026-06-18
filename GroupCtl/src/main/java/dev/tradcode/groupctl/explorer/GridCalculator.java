package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.BitwigSelectionChanged;
import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import dev.tradcode.groupctl.explorer.events.Marker;
import dev.tradcode.groupctl.explorer.events.MarkersChanged;
import dev.tradcode.groupctl.explorer.events.PendingSelectionChanged;
import dev.tradcode.groupctl.explorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.explorer.events.RequestExplorerPage;
import dev.tradcode.groupctl.explorer.events.SelectionModeChanged;
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
    double pendingStart = 0;
    double pendingDuration = 0;
    double playbackBeat = 0;
    boolean isPlaying = false;
    int barsPerPad = 1;
    int page = 0;
    boolean pageActive = false;
    boolean selecting = false;

    public GridCalculator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void recompute() {
        if (!this.pageActive)
            return;

        List<Block> blocks = this.barsCalculator.apply(this.markers);
        if (!this.selecting)
            blocks = this.selectionHighlighter.apply(blocks, this.selectionStart, this.selectionDuration);
        blocks = this.selectionHighlighter.apply(blocks, this.pendingStart, this.pendingDuration);
        blocks = this.playbackHighlighter.apply(blocks, this.playbackBeat, this.isPlaying);
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
            case PendingSelectionChanged(double start, double duration) -> {
                this.pendingStart = start;
                this.pendingDuration = duration;
                this.recompute();
            }
            case PlaybackUpdate(double beat, boolean isPlaying) -> {
                this.playbackBeat = beat;
                this.isPlaying = isPlaying;
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
            case SelectionModeChanged(boolean active) -> {
                this.selecting = active;
                this.recompute();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                if (!this.pageActive)
                    this.selecting = false;
                this.recompute();
            }
            default -> { }
        }
    }
}
