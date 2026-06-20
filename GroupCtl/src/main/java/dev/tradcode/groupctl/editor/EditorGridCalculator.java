package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorKeyOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
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
    int keyOffset = 0;
    int colOffset = 0;
    boolean pageActive = false;

    public EditorGridCalculator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void recompute() {
        if (!this.pageActive)
            return;
        List<EditorSlot> slots = this.quantizer.apply(
            this.notes, this.denominator, this.exists, this.colOffset, this.keyOffset);
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
            case EditorKeyOffsetChanged(int keyOffset) -> {
                this.keyOffset = keyOffset;
                this.recompute();
            }
            case RequestEditorGridRepaint() -> this.recompute();
            case PageSelected(int n) -> {
                this.pageActive = Page.isEditorPage(n);
                this.recompute();
            }
            default -> { }
        }
    }
}
