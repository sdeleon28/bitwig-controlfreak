package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorGridChanged;
import dev.tradcode.groupctl.editor.events.EditorSlot;
import dev.tradcode.groupctl.editor.events.RequestClearNotes;
import dev.tradcode.groupctl.editor.events.RequestSetNote;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;

public class EditorNoteHandler implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean clipExists = false;
    List<EditorSlot> grid = new ArrayList<>();

    public EditorNoteHandler(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void handlePad(int note) {
        int idx = EditorConstants.PADS.indexOf(note);
        if (idx < 0 || idx >= this.grid.size())
            return;
        EditorSlot slot = this.grid.get(idx);
        if (slot.lit())
            this.bus.send(new RequestClearNotes(slot.key(), slot.startBeat(), slot.endBeat()));
        else
            this.bus.send(new RequestSetNote(slot.key(), slot.startBeat()));
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> this.pageActive = n == EditorConstants.PAGE_INDEX;
            case EditorGridChanged(var slots, var clipExists) -> {
                this.grid = slots;
                this.clipExists = clipExists;
            }
            case PadClicked(int n) when this.pageActive && this.clipExists ->
                this.handlePad(n);
            default -> { }
        }
    }
}
