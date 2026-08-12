package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.Block;
import dev.tradcode.groupctl.baseexplorer.GridPipeline;
import dev.tradcode.groupctl.baseexplorer.Song;
import dev.tradcode.groupctl.baseexplorer.SongParser;
import dev.tradcode.groupctl.baseexplorer.events.BitwigSelectionChanged;
import dev.tradcode.groupctl.baseexplorer.events.ContentBarsChanged;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.Marker;
import dev.tradcode.groupctl.baseexplorer.events.MarkersChanged;
import dev.tradcode.groupctl.baseexplorer.events.PendingSelectionChanged;
import dev.tradcode.groupctl.baseexplorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.baseexplorer.events.RequestExplorerPage;
import dev.tradcode.groupctl.baseexplorer.events.RequestSetPlaybackPosition;
import dev.tradcode.groupctl.baseexplorer.events.SelectionModeChanged;
import dev.tradcode.groupctl.setlistexplorer.events.CurrentSongChanged;
import dev.tradcode.groupctl.setlistexplorer.events.RequestSelectSong;
import dev.tradcode.groupctl.setlistexplorer.events.SetlistChanged;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.ResolutionChanged;

/**
 * The setlist explorer's reducer: shows one {@code { }} song at a time and pages
 * bars within it. Engaged only while a setlist is present. Follows the playhead
 * across song boundaries during playback, and lets the song pager step songs
 * while stopped. Broadcasts the same {@link ExplorerGridChanged} the shared
 * painter consumes, plus its own song/setlist events for the setlist controls.
 */
public class SetlistGridCalculator implements IEventBusSubscriber {
    IEventBus bus;

    final SongParser parser = new SongParser();
    final SongBarsCalculator songBars = new SongBarsCalculator();
    final GridPipeline pipeline = new GridPipeline();

    List<Marker> markers = new ArrayList<>();
    List<Song> songs = new ArrayList<>();
    int currentSongIndex = 0;
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

    public SetlistGridCalculator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private Song currentSong() {
        if (this.songs.isEmpty())
            return null;
        int i = clampIndex(this.currentSongIndex);
        return this.songs.get(i);
    }

    private int clampIndex(int i) {
        if (this.songs.isEmpty())
            return 0;
        return Math.min(Math.max(i, 0), this.songs.size() - 1);
    }

    private void recompute() {
        if (!this.setlist)
            return;

        List<Block> source = this.songBars.apply(currentSong());
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

    private void emitCurrentSong(boolean manual) {
        Song song = currentSong();
        String name = song != null ? song.name() : "";
        double start = song != null ? song.startBeat() : 0;
        this.bus.send(new CurrentSongChanged(
            clampIndex(this.currentSongIndex), this.songs.size(), name, start, manual));
    }

    private void rebuildSongs() {
        this.songs = this.parser.groupSongs(this.markers);
        this.currentSongIndex = clampIndex(this.currentSongIndex);
        List<String> names = new ArrayList<>(this.songs.size());
        for (Song s : this.songs)
            names.add(s.name());
        this.bus.send(new SetlistChanged(names));
    }

    private void selectSong(int target) {
        int idx = clampIndex(target);
        if (this.songs.isEmpty() || idx == this.currentSongIndex)
            return;
        this.currentSongIndex = idx;
        this.page = 0;
        this.lastBars = -1;
        this.recompute();
        this.emitCurrentSong(true);
        Song song = currentSong();
        if (song != null)
            this.bus.send(new RequestSetPlaybackPosition(song.startBeat()));
    }

    private void followPlayhead() {
        if (!this.setlist || !this.isPlaying)
            return;
        int idx = this.parser.findSongIndexContainingBeat(this.songs, this.playbackBeat);
        if (idx >= 0 && idx != this.currentSongIndex) {
            this.currentSongIndex = idx;
            this.page = 0;
            this.lastBars = -1;
            this.recompute();
            this.emitCurrentSong(false);
        }
    }

    public void on(Event event) {
        switch (event) {
            case MarkersChanged(var m) -> {
                this.markers = m;
                this.rebuildSongs();
                this.lastBars = -1;
                this.recompute();
                this.emitCurrentSong(false);
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
                int before = this.currentSongIndex;
                this.followPlayhead();
                if (this.currentSongIndex == before)
                    this.recompute();
            }
            case ResolutionChanged(int bpp) -> {
                this.barsPerPad = bpp;
                this.recompute();
            }
            case RequestExplorerPage(int delta) -> {
                if (this.setlist) {
                    this.page += delta;
                    this.recompute();
                }
            }
            case RequestSelectSong(int delta) -> {
                if (this.setlist)
                    this.selectSong(this.currentSongIndex + delta);
            }
            case SelectionModeChanged(boolean active) -> {
                this.selecting = active;
                this.recompute();
            }
            case ExplorerModeChanged(boolean s) -> {
                this.setlist = s;
                this.lastBars = -1;
                this.recompute();
                if (s)
                    this.emitCurrentSong(false);
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
