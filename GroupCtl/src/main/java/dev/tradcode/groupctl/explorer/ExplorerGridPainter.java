package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.ExplorerGridChanged;
import dev.tradcode.groupctl.explorer.events.GridSlot;

import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PaintPad;

public class ExplorerGridPainter implements IEventBusSubscriber {
    IEventBus bus;

    public ExplorerGridPainter(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case ExplorerGridChanged(var slots, var totalPages, var page) -> {
                int n = Math.min(slots.size(), ExplorerConstants.PAGE_SIZE);
                for (int i = 0; i < n; i++) {
                    int note = ExplorerConstants.PADS.get(i);
                    GridSlot s = slots.get(i);
                    if (s.empty())
                        this.bus.send(new PaintPad(note, 0));
                    else if (s.playing())
                        this.bus.send(new BlinkPad(note, ExplorerColors.WHITE));
                    else if (s.selected())
                        this.bus.send(new PaintPad(note, ExplorerColors.WHITE));
                    else
                        this.bus.send(new PaintPad(note, s.color()));
                }
            }
            default -> { }
        }
    }
}
