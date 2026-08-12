package dev.tradcode.groupctl.normalexplorer;

import dev.tradcode.groupctl.baseexplorer.BarsCalculator;
import dev.tradcode.groupctl.baseexplorer.Block;
import dev.tradcode.groupctl.baseexplorer.GridPipeline;
import dev.tradcode.groupctl.baseexplorer.events.BitwigSelectionChanged;
import dev.tradcode.groupctl.baseexplorer.events.ContentBarsChanged;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.Marker;
import dev.tradcode.groupctl.baseexplorer.events.MarkersChanged;
import dev.tradcode.groupctl.baseexplorer.events.PendingSelectionChanged;
import dev.tradcode.groupctl.baseexplorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.baseexplorer.events.RequestExplorerPage;
import dev.tradcode.groupctl.baseexplorer.events.SelectionModeChanged;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.ResolutionChanged;

/**
 * The normal explorer's reducer: lays every project marker onto one continuous
 * timeline and pages through it 64 pads at a time. Engaged only while no setlist
 * is present ({@code !setlist}); when the setlist view takes over it caches its
 * inputs but stops broadcasting so the surface is left to the other reducer.
 */
public class NormalGridCalculator implements IEventBusSubscriber {
    IEventBus bus;

    final BarsCalculator barsCalculator = new BarsCalculator();
    final GridPipeline pipeline = new GridPipeline();

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
    boolean setlist = false;
    int lastBars = -1;

    public NormalGridCalculator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void recompute() {
        if (this.setlist)
            return;

        List<Block> source = this.barsCalculator.apply(this.markers);
        int bars = source.size();
        if (bars != this.lastBars) {
            this.lastBars = bars;
            this.bus.send(new ContentBarsChanged(bars));
        }

        if (!this.pageActive)
            return;

        GridPipeline.Result r = this.pipeline.reduce(
            source, this.selecting,
            this.selectionStart, this.selectionDuration,
            this.pendingStart, this.pendingDuration,
            this.playbackBeat, this.isPlaying,
            this.barsPerPad, this.page);
        this.page = r.page();
        this.bus.send(new ExplorerGridChanged(r.slots(), r.totalPages(), r.page()));
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
                if (!this.setlist) {
                    this.page += delta;
                    this.recompute();
                }
            }
            case SelectionModeChanged(boolean active) -> {
                this.selecting = active;
                this.recompute();
            }
            case ExplorerModeChanged(boolean s) -> {
                this.setlist = s;
                this.lastBars = -1;
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
