package dev.tradcode.groupctl.editor.ggd;

import dev.tradcode.groupctl.editor.EditorConstants;
import dev.tradcode.groupctl.editor.FakeEventBus;
import dev.tradcode.groupctl.editor.events.EditorClipTrackChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysProposed;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.PageSelected;

class GgdMapperTest {

    private static final int EDITOR = EditorConstants.PAGE_INDEX;
    private static final int EDITOR_BOTTOM = EditorConstants.PAGE_INDEX_BOTTOM;

    @Test
    void proposesTheTopPageMapOnAGgdTrack() {
        FakeEventBus bus = new FakeEventBus();
        new GgdMapper(bus);

        bus.send(new EditorClipTrackChanged("My GGD Kit"));
        bus.send(new PageSelected(EDITOR));

        EditorRowKeysProposed p = bus.last(EditorRowKeysProposed.class);
        assertEquals(GgdMapper.PRIORITY, p.priority());
        assertTrue(p.applicable());
        assertArrayEquals(GgdDrumMap.rowKeys(true), p.rowKeys());
    }

    @Test
    void proposesTheBottomPageMapOnTheBottomPage() {
        FakeEventBus bus = new FakeEventBus();
        new GgdMapper(bus);

        bus.send(new EditorClipTrackChanged("ggd"));
        bus.send(new PageSelected(EDITOR_BOTTOM));

        assertArrayEquals(GgdDrumMap.rowKeys(false),
            bus.last(EditorRowKeysProposed.class).rowKeys());
    }

    @Test
    void withdrawsOnANonGgdTrack() {
        FakeEventBus bus = new FakeEventBus();
        new GgdMapper(bus);

        bus.send(new EditorClipTrackChanged("Bass"));

        assertFalse(bus.last(EditorRowKeysProposed.class).applicable());
    }

    @Test
    void doesNotProposeWhilePagingAnInapplicableTrack() {
        FakeEventBus bus = new FakeEventBus();
        new GgdMapper(bus);

        bus.send(new EditorClipTrackChanged("Bass"));
        long before = bus.count(EditorRowKeysProposed.class);

        bus.send(new PageSelected(EDITOR));
        assertEquals(before, bus.count(EditorRowKeysProposed.class));
    }

    @Test
    void repagesTheLayoutWhenSwitchingPagesOnAGgdTrack() {
        FakeEventBus bus = new FakeEventBus();
        new GgdMapper(bus);

        bus.send(new EditorClipTrackChanged("ggd"));
        bus.send(new PageSelected(EDITOR));
        assertArrayEquals(GgdDrumMap.rowKeys(true),
            bus.last(EditorRowKeysProposed.class).rowKeys());

        bus.send(new PageSelected(EDITOR_BOTTOM));
        assertArrayEquals(GgdDrumMap.rowKeys(false),
            bus.last(EditorRowKeysProposed.class).rowKeys());
    }
}
