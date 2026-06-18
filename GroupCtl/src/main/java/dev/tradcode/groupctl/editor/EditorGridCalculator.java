package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import java.util.ArrayList;
import java.util.List;

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
    boolean pageActive = false;

    public EditorGridCalculator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void recompute() {
        if (!this.pageActive)
            return;
        List<EditorSlot> slots = this.quantizer.apply(this.notes, this.denominator, this.exists);
        this.bus.send(new EditorGridChanged(slots, this.exists));
    }

    public void on(Event event) {
        switch (event) {
            case EditorClipChanged(boolean exists, var notes) -> {
                this.exists = exists;
                this.notes = notes;
                this.recompute();
            }
            case EditorResolutionChanged(int denominator) -> {
                this.denominator = denominator;
                this.recompute();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == EditorConstants.PAGE_INDEX;
                this.recompute();
            }
            default -> { }
        }
    }
}
