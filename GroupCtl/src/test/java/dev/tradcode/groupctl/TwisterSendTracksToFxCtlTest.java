package dev.tradcode.groupctl;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.BitwigSend;
import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectDevice;
import dev.tradcode.groupctl.events.SchemaChanged;
import dev.tradcode.groupctl.events.SendValueUpdated;
import dev.tradcode.groupctl.events.SendsChanged;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.SetSelectedTrackSend;

class TwisterSendTracksToFxCtlTest {

    static final String BLUE = "86,96,198";
    static final int GROUP_ID = 10;
    static final int DI_ID = 11;   // "di (1)"  -> encoder 1
    static final int LO_ID = 12;   // "lo (2)"  -> encoder 2
    static final int FX = 2;       // selected FX / send index

    private static BitwigTrack leaf(int id, String name) {
        var t = new BitwigTrack();
        t.id = id;
        t.channelIndex = id;
        t.name = name;
        t.isGroup = false;
        t.children = new ArrayList<>();
        t.color = BLUE;
        return t;
    }

    private static ArrayList<BitwigTrack> schema() {
        var group = leaf(GROUP_ID, "bass (2)");
        group.isGroup = true;
        group.children.add(leaf(DI_ID, "di (1)"));
        group.children.add(leaf(LO_ID, "lo (2)"));
        var schema = new ArrayList<BitwigTrack>();
        schema.add(group);
        return schema;
    }

    private static BitwigSend send(int trackId, int id, double value) {
        var s = new BitwigSend();
        s.trackId = trackId;
        s.id = id;
        s.exists = true;
        s.name = "verb";
        s.value = value;
        return s;
    }

    private static List<BitwigSend> sends() {
        var list = new ArrayList<BitwigSend>();
        list.add(send(DI_ID, FX, 0.25));
        list.add(send(LO_ID, FX, 0.75));
        return list;
    }

    private static Integer ringAt(FakeEventBus bus, int n) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof SetEncoderValue sev && sev.n() == n) last = sev.v();
        return last;
    }

    /** Group selected + sends known, but not yet in FX mode. */
    private static TwisterSendTracksToFxCtl pendingFx(FakeEventBus bus) {
        var ctl = new TwisterSendTracksToFxCtl(bus);
        bus.send(new SchemaChanged(schema()));
        bus.send(new BitwigTrackSelected(GROUP_ID));
        bus.send(new SendsChanged(sends()));
        bus.events.clear();
        return ctl;
    }

    @Test
    void inactiveUntilFxSelected() {
        FakeEventBus bus = new FakeEventBus();
        pendingFx(bus);

        // No FX selected yet: encoder turns must not write sends.
        bus.send(new EncoderTurned(1, 127));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetSelectedTrackSend));
    }

    @Test
    void doesNotActivateInTrackContext() {
        FakeEventBus bus = new FakeEventBus();
        var ctl = new TwisterSendTracksToFxCtl(bus);
        bus.send(new SchemaChanged(schema()));
        bus.send(new BitwigTrackSelected(GROUP_ID)); // group context
        bus.send(new BitwigTrackSelected(DI_ID));    // -> track context
        bus.send(new SendsChanged(sends()));
        bus.events.clear();

        bus.send(new RequestFxSelectTrack(FX, "verb"));

        // A child track is selected, so TwisterSendTrackToAllFxCtl owns the
        // encoders; this program must stay silent.
        assertNull(ringAt(bus, 1));
        bus.send(new EncoderTurned(1, 127));
        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetSelectedTrackSend));
    }

    @Test
    void selectingFxPaintsSendRings() {
        FakeEventBus bus = new FakeEventBus();
        pendingFx(bus);

        bus.send(new RequestFxSelectTrack(FX, "verb"));

        assertEquals(32, ringAt(bus, 1)); // round(0.25 * 127)
        assertEquals(95, ringAt(bus, 2)); // round(0.75 * 127)
    }

    @Test
    void turningEncoderSetsSelectedSend() {
        FakeEventBus bus = new FakeEventBus();
        pendingFx(bus);
        bus.send(new RequestFxSelectTrack(FX, "verb"));
        bus.events.clear();

        bus.send(new EncoderTurned(2, 127));

        var cmd = bus.events.stream()
            .filter(e -> e instanceof SetSelectedTrackSend)
            .map(e -> (SetSelectedTrackSend) e)
            .findFirst()
            .orElse(null);
        assertNotNull(cmd);
        assertEquals(LO_ID, cmd.trackId());
        assertEquals(FX, cmd.sendId());
        assertEquals(1.0, cmd.v(), 1e-9);
    }

    @Test
    void sendValueUpdateForSelectedFxRepaintsRing() {
        FakeEventBus bus = new FakeEventBus();
        pendingFx(bus);
        bus.send(new RequestFxSelectTrack(FX, "verb"));
        bus.events.clear();

        bus.send(new SendValueUpdated(DI_ID, FX, 0.5));

        assertEquals(64, ringAt(bus, 1)); // round(0.5 * 127)
    }

    @Test
    void sendValueUpdateForOtherFxDoesNotRepaint() {
        FakeEventBus bus = new FakeEventBus();
        pendingFx(bus);
        bus.send(new RequestFxSelectTrack(FX, "verb"));
        bus.events.clear();

        bus.send(new SendValueUpdated(DI_ID, FX + 1, 0.5));

        assertNull(ringAt(bus, 1));
    }

    @Test
    void selectingTrackReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        pendingFx(bus);
        bus.send(new RequestFxSelectTrack(FX, "verb"));
        bus.events.clear();

        bus.send(new BitwigTrackSelected(GROUP_ID));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetSelectedTrackSend));
    }

    @Test
    void grabbingDeviceReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        pendingFx(bus);
        bus.send(new RequestFxSelectTrack(FX, "verb"));
        bus.events.clear();

        bus.send(new RequestSelectDevice(0));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetSelectedTrackSend));
    }
}
