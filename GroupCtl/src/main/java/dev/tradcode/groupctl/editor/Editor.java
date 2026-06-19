package dev.tradcode.groupctl.editor;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

public class Editor {
    BitwigEditorClipTracker clipTracker;
    BitwigPlaybackTracker playbackTracker;

    public Editor(IEventBus bus, ControllerHost host) {
        // Calculation
        new EditorGridCalculator(bus);

        // Painting
        new EditorGridPainter(bus);

        // Input controllers
        new EditorResolutionCtl(bus);
        new EditorPageCtl(bus);
        new EditorNoteHandler(bus);
        new PadContextCtl(bus);
        new TwisterMidiContextCtl(bus);
        new PlaybackHandler(bus);

        // Bitwig trackers
        this.clipTracker = new BitwigEditorClipTracker(bus, host);
        this.playbackTracker = new BitwigPlaybackTracker(bus, host);
    }

    public void flush() {
        this.clipTracker.flush();
        this.playbackTracker.flush();
    }
}
