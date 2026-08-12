package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.setlistexplorer.events.CurrentSongChanged;
import dev.tradcode.groupctl.setlistexplorer.events.RequestSelectSong;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

/**
 * Song prev/next on the LEFT/RIGHT top buttons, lit cyan when a neighbouring
 * song exists. Disabled (dark, no-op) while the transport is playing, since the
 * reducer auto-follows the playhead then and a manual step would fight it.
 *
 * <p>LEFT/RIGHT are shared with the normal explorer's page pager, so this
 * control paints them only while engaged and otherwise yields by ceasing to
 * paint — never blanking them (the normal pager repaints them).
 */
public class SongPagerCtl implements IEventBusSubscriber {
    IEventBus bus;
    int index = 0;
    int count = 0;
    boolean pageActive = false;
    boolean setlist = false;
    boolean isPlaying = false;

    public SongPagerCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive || !this.setlist)
            return;
        boolean disabled = this.isPlaying;
        this.bus.send(
            new PaintTopButton(TopButton.LEFT,
                (!disabled && this.index > 0) ? SetlistColors.PAGER : 0),
            new PaintTopButton(TopButton.RIGHT,
                (!disabled && this.index < this.count - 1) ? SetlistColors.PAGER : 0)
        );
    }

    public void on(Event event) {
        switch (event) {
            case TopButtonClick(var btn)
            when this.pageActive && this.setlist && !this.isPlaying
              && btn == TopButton.LEFT && this.index > 0 ->
                this.bus.send(new RequestSelectSong(-1));
            case TopButtonClick(var btn)
            when this.pageActive && this.setlist && !this.isPlaying
              && btn == TopButton.RIGHT && this.index < this.count - 1 ->
                this.bus.send(new RequestSelectSong(1));
            case CurrentSongChanged(int index, int count, var name, var start, var manual) -> {
                this.index = index;
                this.count = count;
                this.paint();
            }
            case PlaybackUpdate(double beat, boolean isPlaying) -> {
                this.isPlaying = isPlaying;
                this.paint();
            }
            case ExplorerModeChanged(boolean s) -> {
                this.setlist = s;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                this.paint();
            }
            default -> { }
        }
    }
}
