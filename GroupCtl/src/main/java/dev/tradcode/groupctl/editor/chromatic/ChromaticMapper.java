package dev.tradcode.groupctl.editor.chromatic;

import dev.tradcode.groupctl.editor.GridGeometry;
import dev.tradcode.groupctl.editor.events.EditorClipTrackChanged;
import dev.tradcode.groupctl.editor.events.EditorKeyOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysProposed;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

/**
 * The default mapping: C1 on the bottom row, ascending chromatically, windowed
 * by the vertical pager's key offset so the two pages scroll between octaves. It
 * applies to every track, so it carries the lowest priority and wins only when
 * no more specific mapper claims the clip. It knows of no other mapper.
 */
public class ChromaticMapper implements IEventBusSubscriber {
    static final int PRIORITY = 0;

    IEventBus bus;
    int keyOffset = 0;

    public ChromaticMapper(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void propose() {
        this.bus.send(new EditorRowKeysProposed(
            PRIORITY, true, GridGeometry.chromaticRowKeys(this.keyOffset)));
    }

    public void on(Event event) {
        switch (event) {
            case EditorClipTrackChanged(String trackName) -> this.propose();
            case EditorKeyOffsetChanged(int keyOffset) -> {
                this.keyOffset = keyOffset;
                this.propose();
            }
            default -> { }
        }
    }
}
