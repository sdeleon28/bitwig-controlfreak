package dev.tradcode.groupctl.mixmachine;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.BlinkPad;
import dev.tradcode.groupctl.events.FxSchemaChanged;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectDevice;
import dev.tradcode.groupctl.events.RequestSelectTrack;

class LaunchpadFxCtlTest {

    static final String BLUE = "86,96,198"; // -> launchpad 69
    static final int BLUE_LP = 69;
    static final int GROUP_ID = 10;

    // FX0 -> pad 55, FX1 -> pad 56 (LaunchpadFxCtl GLOBAL_TO_LOCAL)
    static final int FX0_PAD = 55;

    private static BitwigTrack fx(int id, String name) {
        var t = new BitwigTrack();
        t.id = id;
        t.channelIndex = id;
        t.name = name;
        t.isGroup = false;
        t.children = new ArrayList<>();
        t.color = BLUE;
        return t;
    }

    private static ArrayList<BitwigTrack> fxSchema() {
        var fx = new ArrayList<BitwigTrack>();
        fx.add(fx(0, "verb"));
        fx.add(fx(1, "delay"));
        return fx;
    }

    /** Last color painted to global pad {@code pos} (PaintPad or BlinkPad), or null. */
    private static Integer padColorAt(FakeEventBus bus, int pos) {
        Integer last = null;
        for (var e : bus.events) {
            if (e instanceof PaintPad pp && pp.n() == pos) last = pp.color();
            if (e instanceof BlinkPad bp && bp.n() == pos) last = bp.color();
        }
        return last;
    }

    private static LaunchpadFxCtl withFx(FakeEventBus bus) {
        var ctl = new LaunchpadFxCtl(bus);
        bus.send(new FxSchemaChanged(fxSchema()));
        return ctl;
    }

    @Test
    void fxPadsDarkUntilTrackSelected() {
        FakeEventBus bus = new FakeEventBus();
        withFx(bus);

        // No group/track selected yet: the FX schema must not light the pads.
        assertEquals(0, padColorAt(bus, FX0_PAD));
    }

    @Test
    void selectingTrackLightsFxPads() {
        FakeEventBus bus = new FakeEventBus();
        withFx(bus);

        bus.send(new BitwigTrackSelected(GROUP_ID));

        assertEquals(BLUE_LP, padColorAt(bus, FX0_PAD));
    }

    @Test
    void reSelectingGroupLightsFxPads() {
        FakeEventBus bus = new FakeEventBus();
        withFx(bus);

        bus.send(new RequestSelectTrack(GROUP_ID, "bass (2)"));

        assertEquals(BLUE_LP, padColorAt(bus, FX0_PAD));
    }

    @Test
    void selectingDeviceDarkensFxPads() {
        FakeEventBus bus = new FakeEventBus();
        withFx(bus);
        bus.send(new BitwigTrackSelected(GROUP_ID)); // lit
        bus.events.clear();

        bus.send(new RequestSelectDevice(0));

        assertEquals(0, padColorAt(bus, FX0_PAD)); // handed over to device controls
    }

    @Test
    void selectingTrackAfterDeviceRelightsFxPads() {
        FakeEventBus bus = new FakeEventBus();
        withFx(bus);
        bus.send(new BitwigTrackSelected(GROUP_ID));
        bus.send(new RequestSelectDevice(0)); // dark
        bus.events.clear();

        bus.send(new BitwigTrackSelected(GROUP_ID));

        assertEquals(BLUE_LP, padColorAt(bus, FX0_PAD));
    }

    @Test
    void padNotInteractiveBeforeSelection() {
        FakeEventBus bus = new FakeEventBus();
        withFx(bus);

        bus.send(new PadClicked(FX0_PAD));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof RequestFxSelectTrack));
    }

    @Test
    void padInteractiveAfterSelection() {
        FakeEventBus bus = new FakeEventBus();
        withFx(bus);
        bus.send(new RequestSelectTrack(GROUP_ID, "bass (2)"));
        bus.events.clear();

        bus.send(new PadClicked(FX0_PAD));

        var cmd = bus.events.stream()
            .filter(e -> e instanceof RequestFxSelectTrack)
            .map(e -> (RequestFxSelectTrack) e)
            .findFirst()
            .orElse(null);
        assertNotNull(cmd);
        assertEquals(0, cmd.trackId());
        assertEquals("verb", cmd.trackName());
    }

    @Test
    void padNotInteractiveWhileDeviceSelected() {
        FakeEventBus bus = new FakeEventBus();
        withFx(bus);
        bus.send(new RequestSelectTrack(GROUP_ID, "bass (2)"));
        bus.send(new RequestSelectDevice(0));
        bus.events.clear();

        bus.send(new PadClicked(FX0_PAD));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof RequestFxSelectTrack));
    }
}
