package dev.tradcode.groupctl.editor;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

public class Editor {
    BitwigEditorClipTracker clipTracker;

    public Editor(IEventBus bus, ControllerHost host) {
        // Calculation
        new EditorGridCalculator(bus);

        // Painting
        new EditorGridPainter(bus);

        // Input controllers
        new EditorResolutionCtl(bus);
        new EditorNoteHandler(bus);

        // Bitwig trackers
        this.clipTracker = new BitwigEditorClipTracker(bus, host);
    }

    public void flush() {
        this.clipTracker.flush();
    }
}
