package dev.tradcode.groupctl.editor.instantscroll;

import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.RequestColumnScroll;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

/**
 * Jumps the visible column offset straight to an instant scroll target. The
 * animated scroller cancels any in-flight animation off the same event, so the
 * jump is never overrun by a stale frame.
 */
public class InstantScrollCtl implements IEventBusSubscriber {
    IEventBus bus;

    public InstantScrollCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case RequestColumnScroll(int target, boolean animate) -> {
                if (!animate)
                    this.bus.send(new EditorColumnOffsetChanged(target));
            }
            default -> { }
        }
    }
}
