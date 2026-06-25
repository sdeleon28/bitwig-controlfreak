package dev.tradcode.groupctl.mixmachine;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.MasterRcSelected;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;

class LaunchpadGroupCtlTest {

    static final String BLUE = "86,96,198"; // -> launchpad 69
    static final int BLUE_LP = 69;
    static final int GROUP_ID = 10;
    static final int GROUP_PAD = 15;   // position 1 -> note 15
    static final int MASTER_PAD = 48;  // reserved corner pad

    private static BitwigTrack group(int id, String name) {
        var t = new BitwigTrack();
        t.id = id;
        t.channelIndex = id;
        t.name = name;
        t.isGroup = true;
        t.children = new ArrayList<>();
        t.color = BLUE;
        return t;
    }

    private static ArrayList<BitwigTrack> oneGroup() {
        var schema = new ArrayList<BitwigTrack>();
        schema.add(group(GROUP_ID, "bass (1)"));
        return schema;
    }

    /** Last paint/blink event targeting a pad, or null. */
    private static Event lastPadEvent(FakeEventBus bus, int pad) {
        Event last = null;
        for (var e : bus.events) {
            if (e instanceof PaintPad pp && pp.n() == pad) last = e;
            if (e instanceof BlinkPad bp && bp.n() == pad) last = e;
        }
        return last;
    }

    @Test
    void masterSelectionClearsTheGroupBlink() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadGroupCtl(bus);
        bus.send(new SchemaChanged(oneGroup()));
        bus.send(new BitwigTrackSelected(GROUP_ID));
        assertEquals(new BlinkPad(GROUP_PAD, BLUE_LP), lastPadEvent(bus, GROUP_PAD));

        bus.send(new MasterRcSelected());

        assertEquals(new PaintPad(GROUP_PAD, BLUE_LP), lastPadEvent(bus, GROUP_PAD));
    }

    @Test
    void cornerPadIsReservedFromGroups() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadGroupCtl(bus);
        bus.send(new SchemaChanged(oneGroup()));

        bus.send(new PadClicked(MASTER_PAD));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof RequestSelectTrack));
    }
}
