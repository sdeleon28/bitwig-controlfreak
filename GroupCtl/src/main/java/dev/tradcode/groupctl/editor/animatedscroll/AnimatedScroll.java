package dev.tradcode.groupctl.editor.animatedscroll;

import dev.tradcode.groupctl.Scheduler;
import dev.tradcode.groupctl.events.IEventBus;

/**
 * Renders animated horizontal page turns: an animated {@link
 * dev.tradcode.groupctl.editor.events.RequestColumnScroll} is walked one column
 * at a time so the notes appear to scroll sideways. Self-contained: deleting the
 * one line that constructs this in {@code Editor} leaves paging instant.
 */
public class AnimatedScroll {
    public AnimatedScroll(IEventBus bus, Scheduler scheduler) {
        new AnimatedScrollCtl(bus, scheduler);
    }
}
