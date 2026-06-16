package dev.tradcode.groupctl.explorer;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.ResolutionChanged;

public class ResolutionCalculator implements IEventBusSubscriber {
    int barsPerPad = 1;

    public ResolutionCalculator(IEventBus bus) {
        bus.subscribe(this);
    }

    public List<Block> apply(List<Block> blocks) {
        List<Block> out = new ArrayList<>();
        int n = blocks.size();
        int i = 0;
        while (i < n) {
            Block head = blocks.get(i);
            int color = head.color;
            double startBeat = head.startBeat;
            double endBeat = head.endBeat;
            boolean selected = head.selected;
            boolean playing = head.playing;

            int count = 1;
            int j = i + 1;
            while (j < n && count < barsPerPad && blocks.get(j).color == color) {
                Block b = blocks.get(j);
                endBeat = b.endBeat;
                selected = selected || b.selected;
                playing = playing || b.playing;
                count++;
                j++;
            }
            out.add(new Block(color, startBeat, endBeat, selected, playing, false));
            i = j;
        }
        return out;
    }

    public void on(Event event) {
        switch (event) {
            case ResolutionChanged(int bpp) -> this.barsPerPad = bpp;
            default -> { }
        }
    }
}
