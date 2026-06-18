package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorSlot;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PaintPad;

public class EditorGridPainter implements IEventBusSubscriber {
    IEventBus bus;

    public EditorGridPainter(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case EditorGridChanged(var slots, var clipExists) -> {
                int n = Math.min(slots.size(), EditorConstants.PAGE_SIZE);
                for (int i = 0; i < n; i++) {
                    int note = EditorConstants.PADS.get(i);
                    EditorSlot s = slots.get(i);
                    this.bus.send(new PaintPad(note, s.lit() ? EditorColors.NOTE : 0));
                }
            }
            default -> { }
        }
    }
}
