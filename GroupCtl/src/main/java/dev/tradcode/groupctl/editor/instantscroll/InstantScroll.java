package dev.tradcode.groupctl.editor.instantscroll;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * Renders instant horizontal page turns: an instant {@link
 * dev.tradcode.groupctl.editor.events.RequestColumnScroll} jumps straight to the
 * target column with no animation, used for entry/geometry snaps and playhead
 * following. Self-contained: deleting the one line that constructs this in
 * {@code Editor} removes the instant path.
 */
public class InstantScroll {
    public InstantScroll(IEventBus bus) {
        new InstantScrollCtl(bus);
    }
}
