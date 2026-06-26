package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.PanUpdated;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.events.RequestSetSolo;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.SetTrackPan;
import dev.tradcode.groupctl.mixmachine.events.SetTrackVolume;
import dev.tradcode.groupctl.mixmachine.events.VolumeUpdated;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.SetEncoderValue;

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

    @Test
    void selectingTrackOutsideGroupsReleasesEncoders() {
        // selecting the master track (an id not in our schema) must drop the
        // group context so vol/pan stops driving the encoders
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new BitwigTrackSelected(9999));
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
    void editorPageSuppressesEncodersThenRestores() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.events.clear();
        bus.send(new EncoderTurned(2, 127));
        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetTrackVolume),
            "turns must not move a track while the editor owns the Twister");

        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.send(new EncoderTurned(2, 127));
        assertTrue(bus.events.stream().anyMatch(e -> e instanceof SetTrackVolume),
            "leaving the editor page restores encoder control");
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

    @Test
    void selectingGroupPaintsGroupColorAtEncoder16() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterVolPanCtl(bus);
        bus.send(new SchemaChanged(schema()));
        bus.send(new BitwigTrackSelected(GROUP_ID));

        assertEquals(123, ledAt(bus, 16)); // group color (blue) at the 16th encoder
    }

    @Test
    void soloedGroupPaintsEncoder16Yellow() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterVolPanCtl(bus);
        var s = schema();
        s.get(0).solo = true; // the group itself is soloed
        bus.send(new SchemaChanged(s));
        bus.send(new BitwigTrackSelected(GROUP_ID));

        assertEquals(66, ledAt(bus, 16));
    }

    @Test
    void groupVolumePaintsRingAt16() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new VolumeUpdated(GROUP_ID, 0.5));

        assertEquals(64, ringAt(bus, 16)); // round(0.5 * 127)
    }

    @Test
    void groupPanPaintsRingAt16InPanMode() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new PanModeSelected());
        bus.send(new PanUpdated(GROUP_ID, 1.0));

        assertEquals(127, ringAt(bus, 16));
    }

    @Test
    void turningEncoder16SetsGroupVolume() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new EncoderTurned(16, 127));

        var cmd = bus.events.stream()
            .filter(e -> e instanceof SetTrackVolume)
            .map(e -> (SetTrackVolume) e)
            .findFirst()
            .orElse(null);
        assertNotNull(cmd);
        assertEquals(GROUP_ID, cmd.id());
        assertEquals(1.0, cmd.v(), 1e-9);
    }

    @Test
    void turningEncoder16SetsGroupPanInPanMode() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new PanModeSelected());
        bus.send(new EncoderTurned(16, 0));

        var cmd = bus.events.stream()
            .filter(e -> e instanceof SetTrackPan)
            .map(e -> (SetTrackPan) e)
            .findFirst()
            .orElse(null);
        assertNotNull(cmd);
        assertEquals(GROUP_ID, cmd.id());
        assertEquals(0.0, cmd.v(), 1e-9);
    }

    @Test
    void holdingEncoder16SolosGroup() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new EncoderButtonPressed(16));

        var cmd = soloCmd(bus);
        assertNotNull(cmd);
        assertEquals(GROUP_ID, cmd.trackId());
        assertTrue(cmd.solo());
    }

    @Test
    void releasingEncoder16UnsolosGroup() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new EncoderButtonReleased(16));

        var cmd = soloCmd(bus);
        assertNotNull(cmd);
        assertEquals(GROUP_ID, cmd.trackId());
        assertFalse(cmd.solo());
    }

    @Test
    void groupEncoderDoesNotMoveGroupWhileInactive() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new RequestFxSelectTrack(0, "verb"));
        bus.events.clear();
        bus.send(new EncoderTurned(16, 127));

        assertTrue(bus.events.stream().noneMatch(e -> e instanceof SetTrackVolume));
    }

    // The master track arrives as an ordinary selection (an id that is none of
    // our groups, so selectedGroupId becomes -1). VolPanCtl must yield the
    // encoders to the master RC program rather than stay active and later blank
    // the surface when an unrelated event triggers a repaint — the bug where the
    // master's device resolving wiped the tempo encoder's cyan LED.
    @Test
    void yieldsToANonGroupSelectionAndStaysSilentOnLaterRepaints() {
        FakeEventBus bus = new FakeEventBus();
        selectedGroup(bus);

        bus.send(new BitwigTrackSelected(Integer.MIN_VALUE));
        bus.events.clear();

        // a later repaint trigger: had we stayed active this would clearLeds and
        // stomp whatever the master RC program painted.
        var changed = schema();
        changed.add(leaf(99, "another (3)"));
        bus.send(new SchemaChanged(changed));

        assertTrue(
            bus.events.stream().noneMatch(e -> e instanceof PaintEncoder),
            "VolPanCtl must not paint or clear encoders after yielding to a non-group selection"
        );
    }
}
