package dev.tradcode.groupctl.programchange;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.baseexplorer.Song;
import dev.tradcode.groupctl.baseexplorer.SongParser;
import dev.tradcode.groupctl.baseexplorer.events.MarkersChanged;
import dev.tradcode.groupctl.baseexplorer.events.RequestStopPlayback;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.programchange.events.ProgramChangeReceived;
import dev.tradcode.groupctl.programchange.events.RequestPlayFrom;

public class SongLauncher implements IEventBusSubscriber {
    IEventBus bus;
    SongParser parser = new SongParser();
    List<Song> songs = new ArrayList<>();

    public SongLauncher(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case MarkersChanged(var markers) -> this.songs = parser.groupSongs(markers);
            case ProgramChangeReceived(int program) when program == 0 ->
                this.bus.send(new RequestStopPlayback());
            case ProgramChangeReceived(int program) when program <= this.songs.size() ->
                this.bus.send(new RequestPlayFrom(this.songs.get(program - 1).startBeat()));
            default -> { }
        }
    }
}
