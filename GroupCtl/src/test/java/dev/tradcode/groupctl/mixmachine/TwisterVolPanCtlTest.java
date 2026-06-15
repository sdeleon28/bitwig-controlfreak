package dev.tradcode.groupctl.mixmachine;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import dev.tradcode.groupctl.events.BitwigTrack;
import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.PanUpdated;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectDevice;
import dev.tradcode.groupctl.events.RequestSetSolo;
import dev.tradcode.groupctl.events.SchemaChanged;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.SetTrackPan;
import dev.tradcode.groupctl.events.SetTrackVolume;
import dev.tradcode.groupctl.events.VolumeUpdated;

class TwisterVolPanCtlTest {

    static final String BLUE = "86,96,198"; // -> twister 123
    static final int GROUP_ID = 10;
    static final int DI_ID = 11;   // "di (1)"  -> encoder 1
    static final int LO_ID = 12;   // "lo (2)"  -> encoder 2

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

    /** Final ring value pushed to encoder {@code n}, or null if untouched. */
    private static Integer ringAt(FakeEventBus bus, int n) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof SetEncoderValue sev && sev.n() == n) last = sev.v();
        return last;
    }

    /** Final LED color pushed to encoder {@code n}, or null if untouched. */
    private static Integer ledAt(FakeEventBus bus, int n) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof PaintEncoder pe && pe.n() == n) last = pe.color();
        return last;
    }

    private static TwisterVolPanCtl selectedGroup(FakeEventBus bus) {
        var ctl = new TwisterVolPanCtl(bus);
        bus.send(new SchemaChanged(schema()));
        bus.send(new BitwigTrackSelected(GROUP_ID));
        bus.events.clear();
        return ctl;
    }

    @Test
    void selectingGroupPaintsTrackColors() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterVolPanCtl(bus);
        bus.send(new SchemaChanged(schema()));
        bus.send(new BitwigTrackSelected(GROUP_ID));

        assertEquals(123, ledAt(bus, 1));
        assertEquals(123, ledAt(bus, 2));
    }

    @Test
    void soloedTrackPaintsEncoderYellow() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterVolPanCtl(bus);
        var s = schema();
        s.get(0).children.get(0).solo = true; // di (1) soloed
        bus.send(new SchemaChanged(s));
        bus.send(new BitwigTrackSelected(GROUP_ID));

        assertEquals(66, ledAt(bus, 1));  // soloed -> twister yellow
        assertEquals(123, ledAt(bus, 2)); // not soloed -> track color (blue)
    }

    @Test
    void volumeUpdatePaintsRingAtTrackPosition() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new VolumeUpdated(DI_ID, 0.5));

        assertEquals(64, ringAt(bus, 1)); // round(0.5 * 127)
    }

    @Test
    void turningEncoderSetsVolumeInVolMode() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new EncoderTurned(2, 127));

        var cmd = bus.events.stream()
            .filter(e -> e instanceof SetTrackVolume)
            .map(e -> (SetTrackVolume) e)
            .findFirst()
            .orElse(null);
        assertNotNull(cmd);
        assertEquals(LO_ID, cmd.id());
        assertEquals(1.0, cmd.v(), 1e-9);
    }

    @Test
    void turningEncoderSetsPanInPanMode() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new PanModeSelected());
        bus.send(new EncoderTurned(1, 0));

        var cmd = bus.events.stream()
            .filter(e -> e instanceof SetTrackPan)
            .map(e -> (SetTrackPan) e)
            .findFirst()
            .orElse(null);
        assertNotNull(cmd);
        assertEquals(DI_ID, cmd.id());
        assertEquals(0.0, cmd.v(), 1e-9);
    }

    @Test
    void panUpdateIgnoredWhileInVolMode() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new PanUpdated(DI_ID, 0.5));

        assertNull(ringAt(bus, 1)); // vol mode: pan changes don't touch the ring
    }

    @Test
    void grabbingDeviceReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new RequestSelectDevice(0));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetTrackVolume));
    }

    private static RequestSetSolo soloCmd(FakeEventBus bus) {
        return bus.events.stream()
            .filter(e -> e instanceof RequestSetSolo)
            .map(e -> (RequestSetSolo) e)
            .findFirst()
            .orElse(null);
    }

    @Test
    void holdingEncoderButtonSolosTrack() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new EncoderButtonPressed(2));

        var cmd = soloCmd(bus);
        assertNotNull(cmd);
        assertEquals(LO_ID, cmd.trackId());
        assertTrue(cmd.solo());
    }

    @Test
    void releasingEncoderButtonUnsolosTrack() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new EncoderButtonReleased(1));

        var cmd = soloCmd(bus);
        assertNotNull(cmd);
        assertEquals(DI_ID, cmd.trackId());
        assertFalse(cmd.solo());
    }

    @Test
    void encoderButtonDoesNotSoloWhileInactive() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new RequestFxSelectTrack(0, "verb"));
        bus.events.clear();
        bus.send(new EncoderButtonPressed(1));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof RequestSetSolo));
    }

    @Test
    void selectingFxReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new RequestFxSelectTrack(0, "verb"));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetTrackVolume));
    }
}
