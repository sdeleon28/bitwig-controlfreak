package dev.tradcode.groupctl.editor;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.BitwigScheduler;
import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.editor.animatedscroll.AnimatedScroll;
import dev.tradcode.groupctl.editor.chromatic.Chromatic;
import dev.tradcode.groupctl.editor.followplayhead.FollowPlayhead;
import dev.tradcode.groupctl.editor.ggd.Ggd;
import dev.tradcode.groupctl.editor.instantscroll.InstantScroll;
import dev.tradcode.groupctl.events.IEventBus;

public class Editor {
    BitwigEditorClipTracker clipTracker;
    BitwigPlaybackTracker playbackTracker;

    public Editor(IEventBus bus, ControllerHost host) {
        Scheduler scheduler = new BitwigScheduler(host);

        // Calculation
        new EditorGridCalculator(bus);

        // Row mapping: a selector arbitrates between independent mapper packages.
        // Removing either mapper line below disables that mapping wholesale.
        new EditorMappingSelector(bus);
        new Ggd(bus);
        new Chromatic(bus);

        // Painting
        new EditorGridPainter(bus);

        // Input controllers
        new EditorResolutionCtl(bus);
        new EditorPageCtl(bus);
        new EditorPageSelectorCtl(bus, scheduler);
        new EditorVerticalPager(bus, scheduler);
        new EditorHorizontalPager(bus);
        new AnimatedScroll(bus, scheduler);
        new InstantScroll(bus);
        new EditorNoteHandler(bus);
        new PadContextCtl(bus);
        new HorizontalSliceCtl(bus);
        new TwisterMidiContextCtl(bus);
        new PlaybackHandler(bus);
        new FollowPlayhead(bus);

        // Growls
        new EditorGrowler(bus, host);

        // Bitwig trackers
        this.clipTracker = new BitwigEditorClipTracker(bus, host);
        this.playbackTracker = new BitwigPlaybackTracker(bus, host);
    }

    public void flush() {
        this.clipTracker.flush();
        this.playbackTracker.flush();
    }
}
