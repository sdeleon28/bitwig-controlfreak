package dev.tradcode.groupctl.mixmachine;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.RequestClearMute;
import dev.tradcode.groupctl.events.RequestClearRec;
import dev.tradcode.groupctl.events.RequestClearSolo;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonLongPressed;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;

class ClearActionsCtlTest {

    private static BitwigTrack track(
        int id, String name, boolean isGroup,
        boolean mute, boolean solo, boolean rec,
        BitwigTrack... children
    ) {
        var t = new BitwigTrack();
        t.id = id;
        t.name = name;
        t.isGroup = isGroup;
        t.mute = mute;
        t.solo = solo;
        t.rec = rec;
        t.children = new ArrayList<>(List.of(children));
        return t;
    }

    // A "top refs" group with two muted/soloed/armed reference children, a
    // normal group with a mix of states, and a top-level track. Mirrors the
    // shape of the prototype's complete fixture.
    private static SchemaChanged fixture() {
        var refs = track(0, "top refs (13)", true, false, false, false,
            track(1, "ref1 (1)", false, true, true, true),
            track(2, "ref2 (2)", false, true, true, true));
        var vox = track(3, "top vox (14)", true, false, false, false,
            track(4, "vox main (1)", false, true, false, false),
            track(5, "vox feat (2)", false, false, true, false),
            track(6, "vox harm (3)", false, false, false, true));
        var loose = track(7, "loose (4)", false, true, true, true);
        return new SchemaChanged(new ArrayList<>(List.of(refs, vox, loose)));
    }

    private static <T extends Event> T last(FakeEventBus bus, Class<T> type) {
        T found = null;
        for (var e : bus.events)
            if (type.isInstance(e)) found = type.cast(e);
        return found;
    }

    @Test
    void longPressMuteClearsMutedTracksButSkipsRefs() {
        FakeEventBus bus = new FakeEventBus();
        new ClearActionsCtl(bus);
        bus.send(fixture());

        bus.send(new SideButtonLongPressed(SideButton.MUTE));

        var cleared = last(bus, RequestClearMute.class);
        assertNotNull(cleared);
        // vox main (4) and loose (7) are muted non-refs; ref1/ref2 are skipped.
        assertEquals(Set.of(4, 7), new HashSet<>(cleared.trackIds()));
    }

    @Test
    void longPressSoloClearsAllSolosIncludingRefs() {
        FakeEventBus bus = new FakeEventBus();
        new ClearActionsCtl(bus);
        bus.send(fixture());

        bus.send(new SideButtonLongPressed(SideButton.SOLO));

        var cleared = last(bus, RequestClearSolo.class);
        assertNotNull(cleared);
        // refs are NOT spared for solo clearing.
        assertEquals(Set.of(1, 2, 5, 7), new HashSet<>(cleared.trackIds()));
    }

    @Test
    void longPressRecArmClearsAllArmsIncludingRefs() {
        FakeEventBus bus = new FakeEventBus();
        new ClearActionsCtl(bus);
        bus.send(fixture());

        bus.send(new SideButtonLongPressed(SideButton.RECORD_ARM));

        var cleared = last(bus, RequestClearRec.class);
        assertNotNull(cleared);
        assertEquals(Set.of(1, 2, 6, 7), new HashSet<>(cleared.trackIds()));
    }

    @Test
    void ignoresLongPressWhilePageInactive() {
        FakeEventBus bus = new FakeEventBus();
        new ClearActionsCtl(bus);
        bus.send(fixture());
        bus.send(new PageSelected(1)); // away from mixmachine
        bus.events.clear();

        bus.send(new SideButtonLongPressed(SideButton.MUTE));
        bus.send(new SideButtonLongPressed(SideButton.SOLO));
        bus.send(new SideButtonLongPressed(SideButton.RECORD_ARM));

        assertNull(last(bus, RequestClearMute.class));
        assertNull(last(bus, RequestClearSolo.class));
        assertNull(last(bus, RequestClearRec.class));
    }

    @Test
    void resumesHandlingLongPressWhenPageReactivated() {
        FakeEventBus bus = new FakeEventBus();
        new ClearActionsCtl(bus);
        bus.send(fixture());
        bus.send(new PageSelected(1));
        bus.send(new PageSelected(0));
        bus.events.clear();

        bus.send(new SideButtonLongPressed(SideButton.MUTE));

        assertNotNull(last(bus, RequestClearMute.class));
    }
}
