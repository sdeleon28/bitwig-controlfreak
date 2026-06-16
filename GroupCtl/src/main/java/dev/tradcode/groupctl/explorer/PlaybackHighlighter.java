package dev.tradcode.groupctl.explorer;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PlaybackPositionChanged;

public class PlaybackHighlighter implements IEventBusSubscriber {
    double beat = 0;
    boolean has = false;

    public PlaybackHighlighter(IEventBus bus) {
        bus.subscribe(this);
    }

    public List<Block> apply(List<Block> blocks) {
        if (!has)
            return blocks;
        List<Block> out = new ArrayList<>(blocks.size());
        for (Block b : blocks) {
            if (!b.empty && beat >= b.startBeat && beat < b.endBeat)
                out.add(b.withPlaying(true));
            else
                out.add(b);
        }
        return out;
    }

    public void on(Event event) {
        switch (event) {
            case PlaybackPositionChanged(double bt) -> {
                this.beat = bt;
                this.has = true;
            }
            default -> { }
        }
    }
}
