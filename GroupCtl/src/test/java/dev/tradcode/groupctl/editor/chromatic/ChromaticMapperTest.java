package dev.tradcode.groupctl.editor.chromatic;

import dev.tradcode.groupctl.editor.EditorConstants;
import dev.tradcode.groupctl.editor.FakeEventBus;
import dev.tradcode.groupctl.editor.GridGeometry;
import dev.tradcode.groupctl.editor.events.EditorClipTrackChanged;
import dev.tradcode.groupctl.editor.events.EditorKeyOffsetChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysProposed;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ChromaticMapperTest {

    @Test
    void appliesToEveryTrackAtTheLowestPriority() {
        FakeEventBus bus = new FakeEventBus();
        new ChromaticMapper(bus);

        bus.send(new EditorClipTrackChanged("any GGD or other track"));

        EditorRowKeysProposed p = bus.last(EditorRowKeysProposed.class);
        assertEquals(ChromaticMapper.PRIORITY, p.priority());
        assertTrue(p.applicable());
        assertArrayEquals(GridGeometry.chromaticRowKeys(0), p.rowKeys());
    }

    @Test
    void scrollsItsWindowWithTheKeyOffset() {
        FakeEventBus bus = new FakeEventBus();
        new ChromaticMapper(bus);

        bus.send(new EditorKeyOffsetChanged(EditorConstants.MAX_KEY_OFFSET));

        assertArrayEquals(GridGeometry.chromaticRowKeys(EditorConstants.MAX_KEY_OFFSET),
            bus.last(EditorRowKeysProposed.class).rowKeys());
    }
}
