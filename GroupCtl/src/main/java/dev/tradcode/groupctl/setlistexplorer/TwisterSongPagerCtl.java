package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.baseexplorer.events.PlaybackUpdate;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonClick;
import dev.tradcode.groupctl.setlistexplorer.events.CurrentSongChanged;
import dev.tradcode.groupctl.setlistexplorer.events.RequestSelectSong;

/**
 * Song prev/next on the Twister's bottom-left/bottom-right side buttons. Works
 * on any Launchpad page, but is inert while playing for the same reason as
 * {@link SongPagerCtl}.
 */
public class TwisterSongPagerCtl implements IEventBusSubscriber {
    IEventBus bus;
    int index = 0;
    int count = 0;
    boolean setlist = false;
    boolean isPlaying = false;

    public TwisterSongPagerCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case TwisterSideButtonClick(var btn)
            when this.setlist && !this.isPlaying
              && btn == TwisterSideButton.BOTTOM_LEFT && this.index > 0 ->
                this.bus.send(new RequestSelectSong(-1));
            case TwisterSideButtonClick(var btn)
            when this.setlist && !this.isPlaying
              && btn == TwisterSideButton.BOTTOM_RIGHT && this.index < this.count - 1 ->
                this.bus.send(new RequestSelectSong(1));
            case CurrentSongChanged(int index, int count, var name, var start, var manual) -> {
                this.index = index;
                this.count = count;
            }
            case PlaybackUpdate(double beat, boolean isPlaying) -> this.isPlaying = isPlaying;
            case ExplorerModeChanged(boolean s) -> this.setlist = s;
            default -> { }
        }
    }
}
