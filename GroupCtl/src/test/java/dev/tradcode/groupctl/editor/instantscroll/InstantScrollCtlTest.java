package dev.tradcode.groupctl.editor.instantscroll;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.editor.events.EditorColumnOffsetChanged;
import dev.tradcode.groupctl.editor.events.RequestColumnScroll;

class InstantScrollCtlTest {

    @Test
    void jumpsStraightToTheTargetOffset() {
        FakeEventBus bus = new FakeEventBus();
        new InstantScrollCtl(bus);

        bus.send(new RequestColumnScroll(16, false));

        EditorColumnOffsetChanged jump = bus.last(EditorColumnOffsetChanged.class);
        assertEquals(16, jump.colOffset());
    }

    @Test
    void leavesAnimatedRequestsToTheOtherScroller() {
        FakeEventBus bus = new FakeEventBus();
        new InstantScrollCtl(bus);

        bus.send(new RequestColumnScroll(16, true));

        assertNull(bus.last(EditorColumnOffsetChanged.class));
    }
}
