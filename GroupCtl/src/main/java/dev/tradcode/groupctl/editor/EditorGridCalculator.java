package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorPagerMode;
import dev.tradcode.groupctl.editor.events.EditorPlaybackPosition;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysChanged;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestEditorGridRepaint;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;

public class EditorGridCalculator implements IEventBusSubscriber {
    IEventBus bus;
    final Quantizer quantizer = new Quantizer();

    boolean exists = false;
    List<EditorNote> notes = new ArrayList<>();
    int denominator = EditorConstants.DEFAULT_DENOMINATOR;
    int colOffset = 0;
    double playheadBeat = -1.0;
    boolean pageActive = false;
    boolean pagerMode = false;
    // Which key sits on each grid row is the active mapper's call, not ours; we
    // hold its latest answer and quantize notes onto it. Null until a mapper has
    // spoken, which keeps us silent before there is anything meaningful to paint.
    int[] rowKeys = null;

    public EditorGridCalculator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void recompute() {
        // While the page picker overlays the grid, stay silent: a playhead tick
        // would otherwise repaint the note grid over the overlay. The picker asks
        // for a fresh repaint when it dismisses.
        if (!this.pageActive || this.pagerMode || this.rowKeys == null)
            return;
        List<EditorSlot> slots = this.quantizer.apply(
            this.notes, this.denominator, this.exists, this.colOffset, this.rowKeys,
            this.playheadBeat);
        this.bus.send(new EditorGridChanged(slots, this.exists));
    }

    public void on(Event event) {
        switch (event) {
            case EditorClipChanged(boolean exists, double lengthBeats, var notes) -> {
                this.exists = exists;
                this.notes = notes;
                this.recompute();
            }
            case EditorResolutionChanged(int denominator) -> {
                this.denominator = denominator;
                this.recompute();
            }
            case EditorColumnOffsetChanged(int colOffset) -> {
                this.colOffset = colOffset;
                this.recompute();
            }
            case EditorRowKeysChanged(int[] rowKeys) -> {
                this.rowKeys = rowKeys;
                this.recompute();
            }
            case EditorPlaybackPosition(double beat) -> {
                this.playheadBeat = beat;
                this.recompute();
            }
            case EditorPagerMode(boolean active) -> this.pagerMode = active;
            case RequestEditorGridRepaint() -> this.recompute();
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                this.pagerMode = false;
                this.recompute();
            }
            default -> { }
        }
    }
}
