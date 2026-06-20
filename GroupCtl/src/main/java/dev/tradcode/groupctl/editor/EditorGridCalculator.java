package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorClipChanged;
import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorKeyOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorNote;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;
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
    double lengthBeats = EditorConstants.READ_BEATS;
    int page = 0;
    int keyOffset = 0;
    boolean pageActive = false;

    public EditorGridCalculator(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void recompute() {
        if (!this.pageActive)
            return;
        int totalPages = GridGeometry.totalPages(this.denominator, this.lengthBeats);
        this.page = Math.min(Math.max(this.page, 0), totalPages - 1);
        List<EditorSlot> slots = this.quantizer.apply(
            this.notes, this.denominator, this.exists, this.page, this.keyOffset);
        this.bus.send(
            new EditorGridChanged(slots, this.exists),
            new EditorPageChanged(this.page, totalPages)
        );
    }

    public void on(Event event) {
        switch (event) {
            case EditorClipChanged(boolean exists, double lengthBeats, var notes) -> {
                this.exists = exists;
                this.lengthBeats = lengthBeats;
                this.notes = notes;
                this.recompute();
            }
            case EditorResolutionChanged(int denominator) -> {
                this.denominator = denominator;
                this.recompute();
            }
            case RequestEditorPage(int delta) -> {
                this.page += delta;
                this.recompute();
            }
            case EditorKeyOffsetChanged(int keyOffset) -> {
                this.keyOffset = keyOffset;
                this.recompute();
            }
            case PageSelected(int n) -> {
                boolean wasActive = this.pageActive;
                this.pageActive = Page.isEditorPage(n);
                // Horizontal scroll survives the vertical hop between editor pages,
                // resetting only when the editor is opened afresh.
                // TODO: no need for the reset
                if (this.pageActive && !wasActive)
                    this.page = 0;
                this.recompute();
            }
            default -> { }
        }
    }
}
