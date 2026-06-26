package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.ClearEditorGridCache;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import java.util.Arrays;

import dev.tradcode.groupctl.events.ClearLaunchpad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PaintPad;

public class EditorGridPainter implements IEventBusSubscriber {
    static final int UNKNOWN = -1;

    IEventBus bus;
    // The play cursor sweeps the grid, so the same cell is repainted many times a
    // second; only emit a pad when its colour actually changes to spare the wire.
    final int[] painted = new int[EditorConstants.PAGE_SIZE];

    public EditorGridPainter(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
        Arrays.fill(this.painted, UNKNOWN);
    }

    private static int colorFor(EditorSlot s) {
        if (s.selected())
            return EditorColors.ACTIVE_CONTEXT;
        if (s.playing())
            return s.lit() ? EditorColors.PLAYHEAD_NOTE : EditorColors.PLAYHEAD;
        return s.lit() ? EditorColors.NOTE : 0;
    }

    public void on(Event event) {
        switch (event) {
            case ClearLaunchpad() -> Arrays.fill(this.painted, UNKNOWN);
            case ClearEditorGridCache() -> Arrays.fill(this.painted, UNKNOWN);
            case EditorGridChanged(var slots, var clipExists) -> {
                int n = Math.min(slots.size(), EditorConstants.PAGE_SIZE);
                for (int i = 0; i < n; i++) {
                    int color = colorFor(slots.get(i));
                    if (this.painted[i] == color)
                        continue;
                    this.painted[i] = color;
                    this.bus.send(new PaintPad(EditorConstants.PADS.get(i), color));
                }
            }
            default -> { }
        }
    }
}
