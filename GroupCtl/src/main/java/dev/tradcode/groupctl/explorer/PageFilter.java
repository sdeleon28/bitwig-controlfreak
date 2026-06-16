package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerPageChanged;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

public class PageFilter implements IEventBusSubscriber {
    int page = 0;

    public PageFilter(IEventBus bus) {
        bus.subscribe(this);
    }

    public List<Block> apply(List<Block> blocks) {
        List<Block> out = new ArrayList<>(ExplorerConstants.PAGE_SIZE);
        int offset = page * ExplorerConstants.PAGE_SIZE;
        for (int i = 0; i < ExplorerConstants.PAGE_SIZE; i++) {
            int idx = offset + i;
            out.add(idx < blocks.size() ? blocks.get(idx) : Block.emptySlot());
        }
        return out;
    }

    public void on(Event event) {
        switch (event) {
            case ExplorerPageChanged(int p) -> this.page = p;
            default -> { }
        }
    }
}
