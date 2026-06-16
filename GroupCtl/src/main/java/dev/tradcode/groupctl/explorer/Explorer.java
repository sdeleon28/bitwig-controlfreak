package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.BitwigSelectionChanged;
import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.ExplorerPageChanged;
import dev.tradcode.groupctl.explorer.events.ExplorerPagesChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;
import dev.tradcode.groupctl.explorer.events.Marker;
import dev.tradcode.groupctl.explorer.events.MarkersChanged;
import dev.tradcode.groupctl.explorer.events.PlaybackPositionChanged;
import java.util.ArrayList;
import java.util.List;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.ResolutionChanged;

public class Explorer implements IEventBusSubscriber {
    IEventBus bus;

    BarsCalculator barsCalculator;
    SelectionHighlighter selectionHighlighter;
    PlaybackHighlighter playbackHighlighter;
    ResolutionCalculator resolutionCalculator;
    PageFilter pageFilter;

    PlaybackHandler playbackHandler;
    SelectionCtl selectionCtl;
    ResolutionCtl resolutionCtl;
    ExplorerPageCtl explorerPageCtl;

    BitwigMarkersTracker markersTracker;
    BitwigPlaybackTracker playbackTracker;
    BitwigSelectionTracker selectionTracker;

    List<Marker> markers = new ArrayList<>();
    boolean pageActive = false;
    int lastTotalPages = -1;

    public Explorer(IEventBus bus, ControllerHost host) {
        this.bus = bus;

        // Pipeline stages — constructed (and subscribed) first so they update
        // their state before our own repaint handler runs.
        this.barsCalculator = new BarsCalculator();
        this.selectionHighlighter = new SelectionHighlighter(bus);
        this.playbackHighlighter = new PlaybackHighlighter(bus);
        this.resolutionCalculator = new ResolutionCalculator(bus);
        this.pageFilter = new PageFilter(bus);

        // Input ctls / handlers.
        this.playbackHandler = new PlaybackHandler(bus);
        this.selectionCtl = new SelectionCtl(bus);
        this.resolutionCtl = new ResolutionCtl(bus);
        this.explorerPageCtl = new ExplorerPageCtl(bus);

        // Bitwig trackers.
        this.markersTracker = new BitwigMarkersTracker(bus, host);
        this.playbackTracker = new BitwigPlaybackTracker(bus, host);
        this.selectionTracker = new BitwigSelectionTracker(bus, host);

        // Subscribe LAST so the pipeline stages have already absorbed any state
        // change before a repaint runs.
        this.bus.subscribe(this);
    }

    public void flush() {
        this.markersTracker.flush();
        this.playbackTracker.flush();
        this.selectionTracker.flush();
    }

    private void paint() {
        if (!this.pageActive)
            return;

        List<Block> blocks = this.barsCalculator.apply(this.markers);
        blocks = this.selectionHighlighter.apply(blocks);
        blocks = this.playbackHighlighter.apply(blocks);
        blocks = this.resolutionCalculator.apply(blocks);

        int totalPages = Math.max(1,
            (int) Math.ceil(blocks.size() / (double) ExplorerConstants.PAGE_SIZE));

        List<Block> grid = this.pageFilter.apply(blocks);

        // Broadcast the pad->beat mapping for the handlers.
        List<GridSlot> slots = new ArrayList<>(grid.size());
        for (Block b : grid)
            slots.add(new GridSlot(b.empty, b.startBeat, b.endBeat));
        this.bus.send(new ExplorerGridChanged(slots));

        // Paint all 64 pads (off where empty) so we fully own the grid.
        for (int i = 0; i < ExplorerConstants.PAGE_SIZE; i++) {
            int note = ExplorerConstants.PADS.get(i);
            Block b = grid.get(i);
            if (b.empty)
                this.bus.send(new PaintPad(note, 0));
            else if (b.playing)
                this.bus.send(new BlinkPad(note, ExplorerColors.WHITE));
            else if (b.selected)
                this.bus.send(new PaintPad(note, ExplorerColors.WHITE));
            else
                this.bus.send(new PaintPad(note, b.color));
        }

        // Report page count last: if a clamp results it triggers another paint
        // that emits the corrected grid after this one. Deduped so it
        // converges.
        // TODO: This smells fishy. Is there a better way?
        if (totalPages != this.lastTotalPages) {
            this.lastTotalPages = totalPages;
            this.bus.send(new ExplorerPagesChanged(totalPages));
        }
    }

    public void on(Event event) {
        switch (event) {
            case MarkersChanged(var m) -> {
                this.markers = m;
                this.paint();
            }
            case PlaybackPositionChanged p -> {
                if (this.pageActive) this.paint();
            }
            case BitwigSelectionChanged s -> {
                if (this.pageActive) this.paint();
            }
            case ResolutionChanged r -> {
                if (this.pageActive) this.paint();
            }
            case ExplorerPageChanged e -> {
                if (this.pageActive) this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                if (this.pageActive) {
                    // force a fresh page-count report on entry
                    this.lastTotalPages = -1;
                    this.paint();
                }
            }
            default -> { }
        }
    }
}
