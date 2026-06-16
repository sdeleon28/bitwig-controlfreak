package dev.tradcode.groupctl.explorer;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.SelectionChanged;

public class SelectionHighlighter implements IEventBusSubscriber {
    double start = 0;
    double duration = 0;

    public SelectionHighlighter(IEventBus bus) {
        bus.subscribe(this);
    }

    public List<Block> apply(List<Block> blocks) {
        if (duration <= 0)
            return blocks;
        double end = start + duration;
        List<Block> out = new ArrayList<>(blocks.size());
        for (Block b : blocks) {
            if (!b.empty && b.startBeat < end && b.endBeat > start)
                out.add(b.withSelected(true));
            else
                out.add(b);
        }
        return out;
    }

    public void on(Event event) {
        switch (event) {
            case SelectionChanged(double s, double d) -> {
                this.start = s;
                this.duration = d;
            }
            default -> { }
        }
    }
}
