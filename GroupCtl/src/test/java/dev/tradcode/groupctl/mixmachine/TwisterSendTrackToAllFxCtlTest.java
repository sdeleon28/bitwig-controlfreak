package dev.tradcode.groupctl.mixmachine;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.BitwigSend;
import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.FxPanUpdated;
import dev.tradcode.groupctl.events.FxSchemaChanged;
import dev.tradcode.groupctl.events.FxVolumeUpdated;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestFxSetSolo;
import dev.tradcode.groupctl.events.RequestSelectDevice;
import dev.tradcode.groupctl.events.SchemaChanged;
import dev.tradcode.groupctl.events.SendValueUpdated;
import dev.tradcode.groupctl.events.SendsChanged;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.SetFxTrackPan;
import dev.tradcode.groupctl.events.SetFxTrackVolume;
import dev.tradcode.groupctl.events.SetSelectedTrackSend;

class TwisterSendTrackToAllFxCtlTest {

    static final String BLUE = "86,96,198";
    static final int GROUP_ID = 10;
    static final int CHILD_ID = 11; // "di (1)"

    // FX0 -> send encoder 1, vol/pan encoder 9
    // FX1 -> send encoder 2, vol/pan encoder 10
    static final int FX0 = 0;
    static final int FX1 = 1;

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
        group.children.add(leaf(CHILD_ID, "di (1)"));
        var schema = new ArrayList<BitwigTrack>();
        schema.add(group);
        return schema;
    }

    private static BitwigTrack fx(int id, double volume, double pan) {
        var t = leaf(id, "fx" + id);
        t.volume = volume;
        t.pan = pan;
        return t;
    }

    private static ArrayList<BitwigTrack> fxSchema() {
        var fx = new ArrayList<BitwigTrack>();
        fx.add(fx(FX0, 0.5, 0.25));  // vol 64, pan 32
        fx.add(fx(FX1, 0.75, 0.1));  // vol 95, pan 13
        return fx;
    }

    private static BitwigSend send(int trackId, int fxId, double value) {
        var s = new BitwigSend();
        s.trackId = trackId;
        s.id = fxId;
        s.exists = true;
        s.name = "fx" + fxId;
        s.value = value;
        return s;
    }

    private static List<BitwigSend> sends() {
        var list = new ArrayList<BitwigSend>();
        list.add(send(CHILD_ID, FX0, 0.2));  // 25
        list.add(send(CHILD_ID, FX1, 0.6));  // 76
        return list;
    }

    private static Integer ringAt(FakeEventBus bus, int n) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof SetEncoderValue sev && sev.n() == n) last = sev.v();
        return last;
    }

    private static Integer ledAt(FakeEventBus bus, int n) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof PaintEncoder pe && pe.n() == n) last = pe.color();
        return last;
    }

    private static RequestFxSetSolo soloCmd(FakeEventBus bus) {
        return bus.events.stream()
            .filter(e -> e instanceof RequestFxSetSolo)
            .map(e -> (RequestFxSetSolo) e)
            .findFirst()
            .orElse(null);
    }

    /** Selected group + child track (track context) + fx/sends known. */
    private static TwisterSendTrackToAllFxCtl trackContext(FakeEventBus bus) {
        var ctl = new TwisterSendTrackToAllFxCtl(bus);
        bus.send(new SchemaChanged(schema()));
        bus.send(new FxSchemaChanged(fxSchema()));
        bus.send(new SendsChanged(sends()));
        bus.send(new BitwigTrackSelected(GROUP_ID)); // group context
        bus.send(new BitwigTrackSelected(CHILD_ID)); // -> track context
        bus.events.clear();
        return ctl;
    }

    @Test
    void inactiveInGroupContext() {
        FakeEventBus bus = new FakeEventBus();
        var ctl = new TwisterSendTrackToAllFxCtl(bus);
        bus.send(new SchemaChanged(schema()));
        bus.send(new FxSchemaChanged(fxSchema()));
        bus.send(new SendsChanged(sends()));
        bus.send(new BitwigTrackSelected(GROUP_ID)); // selectedTrack == group
        bus.events.clear();

        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.send(new EncoderTurned(1, 127));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetSelectedTrackSend));
        assertNull(ringAt(bus, 1));
    }

    @Test
    void activatesInTrackContextAndPaintsBothBlocks() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);

        bus.send(new RequestFxSelectTrack(FX0, "fx0"));

        // bottom block: selected track's sends
        assertEquals(25, ringAt(bus, 1)); // round(0.2 * 127)
        assertEquals(76, ringAt(bus, 2)); // round(0.6 * 127)
        // top block: fx vol (vol mode)
        assertEquals(64, ringAt(bus, 9));  // round(0.5 * 127)
        assertEquals(95, ringAt(bus, 10)); // round(0.75 * 127)
    }

    @Test
    void sendEncoderWritesSelectedTrackSend() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new EncoderTurned(2, 127)); // pos 2 -> FX1

        var cmd = bus.events.stream()
            .filter(e -> e instanceof SetSelectedTrackSend)
            .map(e -> (SetSelectedTrackSend) e)
            .findFirst()
            .orElse(null);
        assertNotNull(cmd);
        assertEquals(CHILD_ID, cmd.trackId());
        assertEquals(FX1, cmd.sendId());
        assertEquals(1.0, cmd.v(), 1e-9);
    }

    @Test
    void volPanEncoderWritesFxVolumeInVolMode() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new EncoderTurned(9, 127)); // pos 9 -> FX0 vol/pan

        var cmd = bus.events.stream()
            .filter(e -> e instanceof SetFxTrackVolume)
            .map(e -> (SetFxTrackVolume) e)
            .findFirst()
            .orElse(null);
        assertNotNull(cmd);
        assertEquals(FX0, cmd.id());
        assertEquals(1.0, cmd.v(), 1e-9);
    }

    @Test
    void volPanEncoderWritesFxPanInPanMode() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.send(new PanModeSelected());
        bus.events.clear();

        bus.send(new EncoderTurned(10, 0)); // pos 10 -> FX1 vol/pan

        var cmd = bus.events.stream()
            .filter(e -> e instanceof SetFxTrackPan)
            .map(e -> (SetFxTrackPan) e)
            .findFirst()
            .orElse(null);
        assertNotNull(cmd);
        assertEquals(FX1, cmd.id());
        assertEquals(0.0, cmd.v(), 1e-9);
    }

    @Test
    void panModeShowsFxPanOnTopBlock() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));

        bus.send(new PanModeSelected());

        assertEquals(32, ringAt(bus, 9));  // FX0 pan: round(0.25 * 127)
        assertEquals(13, ringAt(bus, 10)); // FX1 pan: round(0.1 * 127)
    }

    @Test
    void fxVolumeUpdateRepaintsTopRing() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new FxVolumeUpdated(FX0, 1.0));

        assertEquals(127, ringAt(bus, 9));
    }

    @Test
    void fxPanUpdateIgnoredOnRingWhileInVolMode() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new FxPanUpdated(FX0, 1.0));

        assertNull(ringAt(bus, 9)); // vol mode: pan changes don't touch the ring
    }

    @Test
    void sendValueUpdateRepaintsBottomRing() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new SendValueUpdated(CHILD_ID, FX0, 1.0));

        assertEquals(127, ringAt(bus, 1));
    }

    @Test
    void selectingTrackReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new BitwigTrackSelected(CHILD_ID));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetSelectedTrackSend));
    }

    @Test
    void grabbingDeviceReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new RequestSelectDevice(0));
        bus.events.clear();
        bus.send(new EncoderTurned(9, 127));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetFxTrackVolume));
    }

    @Test
    void holdingBottomEncoderButtonSolosCorrespondingFx() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new EncoderButtonPressed(2)); // bottom block pos 2 -> FX1

        var cmd = soloCmd(bus);
        assertNotNull(cmd);
        assertEquals(FX1, cmd.trackId());
        assertTrue(cmd.solo());
    }

    @Test
    void holdingTopEncoderButtonSolosRepresentedFx() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new EncoderButtonPressed(9)); // top block pos 9 -> FX0

        var cmd = soloCmd(bus);
        assertNotNull(cmd);
        assertEquals(FX0, cmd.trackId());
        assertTrue(cmd.solo());
    }

    @Test
    void releasingEncoderButtonUnsolosFx() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));
        bus.events.clear();

        bus.send(new EncoderButtonReleased(10)); // top block pos 10 -> FX1

        var cmd = soloCmd(bus);
        assertNotNull(cmd);
        assertEquals(FX1, cmd.trackId());
        assertFalse(cmd.solo());
    }

    @Test
    void encoderButtonDoesNotSoloWhileInactive() {
        FakeEventBus bus = new FakeEventBus();
        var ctl = new TwisterSendTrackToAllFxCtl(bus);
        bus.send(new SchemaChanged(schema()));
        bus.send(new FxSchemaChanged(fxSchema()));
        bus.send(new SendsChanged(sends()));
        bus.send(new BitwigTrackSelected(GROUP_ID)); // group context: inactive
        bus.events.clear();

        bus.send(new EncoderButtonPressed(1));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof RequestFxSetSolo));
    }

    @Test
    void soloedFxPaintsBothEncodersYellow() {
        FakeEventBus bus = new FakeEventBus();
        trackContext(bus);
        var fx = fxSchema();
        fx.get(FX0).solo = true; // FX0 soloed
        bus.send(new FxSchemaChanged(fx));
        bus.send(new RequestFxSelectTrack(FX0, "fx0"));

        assertEquals(66, ledAt(bus, 1)); // bottom block: soloed -> yellow
        assertEquals(66, ledAt(bus, 9)); // top block: soloed -> yellow
    }
}
