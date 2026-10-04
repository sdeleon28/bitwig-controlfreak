package dev.tradcode.groupctl.mixmachine.trackrc;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.PanUpdated;
import dev.tradcode.groupctl.mixmachine.events.SetTrackPan;
import dev.tradcode.groupctl.mixmachine.events.SetTrackVolume;
import dev.tradcode.groupctl.mixmachine.events.VolumeUpdated;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestToggleSolo;
import dev.tradcode.groupctl.Colors;
import dev.tradcode.groupctl.mixmachine.trackrc.events.SetTrackRcValue;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcEncoderPressed;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcNameChanged;
import dev.tradcode.groupctl.mixmachine.trackrc.events.TrackRcValueChanged;

class TwisterTrackRcCtlTest {

    static final int GROUP_ID = 10;
    static final int TRACK_ID = 11;   // a plain (non-group) child track
    static final int MASTER_ID = Integer.MIN_VALUE;
    static final int CYAN = 19;

    private static BitwigTrack leaf(int id, String name) {
        var t = new BitwigTrack();
        t.id = id;
        t.channelIndex = id;
        t.name = name;
        t.isGroup = false;
        t.children = new ArrayList<>();
        t.color = "86,96,198";
        return t;
    }

    private static ArrayList<BitwigTrack> schema() {
        var group = leaf(GROUP_ID, "bass (2)");
        group.isGroup = true;
        group.children.add(leaf(TRACK_ID, "di (1)"));
        var schema = new ArrayList<BitwigTrack>();
        schema.add(group);
        return schema;
    }

    private static void withSchema(FakeEventBus bus) {
        bus.send(new SchemaChanged(schema()));
    }

    private static void allRcsExist(FakeEventBus bus) {
        for (int id = 0; id < 8; id++)
            bus.send(new TrackRcExistsChanged(id, true));
    }

    private static Integer ledAt(FakeEventBus bus, int pos) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof PaintEncoder pe && pe.n() == pos) last = pe.color();
        return last;
    }

    private static boolean wroteRc(FakeEventBus bus) {
        return bus.events.stream().anyMatch(e -> e instanceof SetTrackRcValue);
    }

    private static SetTrackRcValue lastWrite(FakeEventBus bus) {
        SetTrackRcValue last = null;
        for (var e : bus.events)
            if (e instanceof SetTrackRcValue s) last = s;
        return last;
    }

    private static TrackRcEncoderPressed lastPress(FakeEventBus bus) {
        TrackRcEncoderPressed last = null;
        for (var e : bus.events)
            if (e instanceof TrackRcEncoderPressed p) last = p;
        return last;
    }

    @Test
    void inactiveUntilATrackIsSelected() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);

        bus.send(new EncoderTurned(6, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void selectingATrackLightsDetectedRcsCyan() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        allRcsExist(bus);

        bus.send(new BitwigTrackSelected(TRACK_ID));

        for (int n = 1; n <= 8; n++)
            assertEquals(CYAN, ledAt(bus, n), "encoder " + n + " should be cyan");
    }

    @Test
    void secondPageRcsLightTheTopEncodersButTheTrackEncoder() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        // slots 8..15 are the second remote-controls page
        for (int slot = 8; slot < 16; slot++)
            bus.send(new TrackRcExistsChanged(slot, true));

        bus.send(new BitwigTrackSelected(TRACK_ID));

        for (int n = 9; n <= 15; n++)
            assertEquals(CYAN, ledAt(bus, n), "top encoder " + n + " should be cyan");
    }

    @Test
    void turningATopEncoderWritesTheSecondPageRc() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));
        bus.clear();

        // position 13 maps to slot 8 (second page, param 0)
        bus.send(new EncoderTurned(13, 127));

        var write = lastWrite(bus);
        assertNotNull(write);
        assertEquals(8, write.id());
        assertEquals(1.0, write.value(), 1e-9);
    }

    @Test
    void secondPageValueChangePaintsTopRing() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));
        bus.clear();

        // slot 8 maps to position 13
        bus.send(new TrackRcValueChanged(8, 1.0));

        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 13 && sv.v() == 127));
    }

    @Test
    void onlyDetectedRcsAreLit() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        // only RC id 0 (position 5) exists
        bus.send(new TrackRcExistsChanged(0, true));

        bus.send(new BitwigTrackSelected(TRACK_ID));

        assertEquals(CYAN, ledAt(bus, 5), "the detected RC must be cyan");
        assertEquals(0, ledAt(bus, 6), "an undetected RC must stay dark");
    }

    @Test
    void cachesValuesWhileInactiveAndPaintsThemOnActivation() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);

        bus.send(new TrackRcValueChanged(1, 1.0));
        bus.clear();

        bus.send(new BitwigTrackSelected(TRACK_ID));

        // RC id 1 maps to position 6
        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 6 && sv.v() == 127));
    }

    @Test
    void encoderTurnWritesTrackRcAfterSelection() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));
        bus.clear();

        // position 6 maps to RC id 1
        bus.send(new EncoderTurned(6, 127));

        var write = lastWrite(bus);
        assertNotNull(write);
        assertEquals(1, write.id());
        assertEquals(1.0, write.value(), 1e-9);
    }

    @Test
    void valueChangePaintsRingAtMappedPosition() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));
        bus.clear();

        bus.send(new TrackRcValueChanged(1, 1.0));

        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 6 && sv.v() == 127));
    }

    @Test
    void selectingTheGroupReleasesEncoders() {
        // re-selecting the group hands the encoders back to the vol/pan overview
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));

        bus.send(new BitwigTrackSelected(GROUP_ID));
        bus.clear();
        bus.send(new EncoderTurned(6, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void selectingTheGroupViaRequestReleasesEncoders() {
        // group pads emit RequestSelectTrack(groupId); the group is not a
        // selectable track, so the RC program must yield immediately.
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));

        bus.send(new RequestSelectTrack(GROUP_ID, "bass (2)"));
        bus.clear();
        bus.send(new EncoderTurned(6, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void selectingTheMasterReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));

        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();
        bus.send(new EncoderTurned(6, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void activatesFromRequestSelectTrackBeforeBitwigEchoes() {
        // re-tapping a track pad that is already the Bitwig selection produces
        // no echo, so the request itself must (re)claim the encoders.
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);

        bus.send(new RequestSelectTrack(TRACK_ID, "di (1)"));
        bus.send(new EncoderTurned(6, 127));

        assertTrue(wroteRc(bus));
    }

    @Test
    void deviceGrabbedYieldsEncodersAndReSelectingTrackReclaimsThem() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));

        // grabbing a device — whether from a device pad or Send B — is one event
        bus.send(new DeviceGrabbed("Compressor"));
        bus.clear();
        bus.send(new EncoderTurned(6, 127));
        assertFalse(wroteRc(bus), "device RC must own the encoders while a device is grabbed");

        // re-tapping the track pad reclaims them (Bitwig won't re-echo)
        bus.send(new RequestSelectTrack(TRACK_ID, "di (1)"));
        bus.send(new EncoderTurned(6, 127));
        assertTrue(wroteRc(bus), "re-selecting the track reclaims the encoders from device RC");
    }

    @Test
    void fxSelectionYieldsEncodersForSendRouting() {
        // pressing an FX pad after a track routes a send; the send-to-all-fx
        // program owns the encoders, so the RC program must yield.
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));

        bus.send(new RequestFxSelectTrack(0, "verb"));
        bus.clear();
        bus.send(new EncoderTurned(6, 127));
        assertFalse(wroteRc(bus), "send routing must own the encoders after an FX pad press");

        // tapping the track pad again brings the RCs back
        bus.send(new RequestSelectTrack(TRACK_ID, "di (1)"));
        bus.send(new EncoderTurned(6, 127));
        assertTrue(wroteRc(bus), "re-selecting the track reclaims the encoders from send routing");
    }

    @Test
    void editorPageSuppressesEncodersThenRestores() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));

        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.clear();
        bus.send(new EncoderTurned(6, 127));
        assertFalse(wroteRc(bus), "track RCs must yield while the editor owns the Twister");

        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.send(new EncoderTurned(6, 127));
        assertTrue(wroteRc(bus), "leaving the editor page restores track RC control");
    }

    @Test
    void encoderPressGrowlsTheCorrespondingParamName() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        allRcsExist(bus);
        bus.send(new TrackRcNameChanged(1, "Reverb"));
        bus.send(new BitwigTrackSelected(TRACK_ID));
        bus.clear();

        // position 6 maps to RC id 1
        bus.send(new EncoderButtonPressed(6));

        var press = lastPress(bus);
        assertNotNull(press);
        assertEquals("Reverb", press.name());
        assertEquals("Reverb", press.toString());
    }

    @Test
    void encoderPressIsSilentWhileInactive() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        allRcsExist(bus);
        bus.send(new TrackRcNameChanged(1, "Reverb"));

        bus.send(new EncoderButtonPressed(6));

        assertNull(lastPress(bus), "the program must not growl when another owns the encoders");
    }

    @Test
    void undetectedRcDoesNotGrowlOnPress() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        // only RC id 0 exists; RC id 1 (position 6) does not
        bus.send(new TrackRcExistsChanged(0, true));
        bus.send(new BitwigTrackSelected(TRACK_ID));
        bus.clear();

        bus.send(new EncoderButtonPressed(6));

        assertNull(lastPress(bus), "pressing an empty RC encoder must stay silent");
    }

    private static Integer ringAt(FakeEventBus bus, int pos) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof SetEncoderValue sv && sv.n() == pos) last = sv.v();
        return last;
    }

    private static FakeEventBus trackSelected() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterTrackRcCtl(bus);
        withSchema(bus);
        bus.send(new BitwigTrackSelected(TRACK_ID));
        return bus;
    }

    @Test
    void encoder16IsLitInTheSelectedTracksColor() {
        var bus = trackSelected();
        assertEquals(Colors.toTwister("86,96,198"), ledAt(bus, 16));
    }

    @Test
    void encoder16RingFollowsTheSelectedTracksVolume() {
        var bus = trackSelected();
        bus.send(new VolumeUpdated(TRACK_ID, 0.5));
        assertEquals(64, ringAt(bus, 16));
        bus.send(new TrackRcValueChanged(dev.tradcode.groupctl.mixmachine.SelectedTrackEncoder.SLOT, 1.0));
        assertEquals(64, ringAt(bus, 16), "the RC in slot 16 must not overwrite the track volume");
    }

    @Test
    void turningEncoder16SetsTheVolumeInsteadOfAnRc() {
        var bus = trackSelected();
        bus.send(new EncoderTurned(16, 127));
        assertTrue(bus.events.contains(new SetTrackVolume(TRACK_ID, 1.0)));
        assertFalse(wroteRc(bus));
    }

    @Test
    void inPanModeEncoder16ShowsAndSetsPan() {
        var bus = trackSelected();
        bus.send(new VolumeUpdated(TRACK_ID, 0.0), new PanUpdated(TRACK_ID, 1.0), new PanModeSelected());
        assertEquals(127, ringAt(bus, 16));
        bus.send(new EncoderTurned(16, 0));
        assertTrue(bus.events.contains(new SetTrackPan(TRACK_ID, 0.0)));
    }

    @Test
    void pressingEncoder16TogglesTheTracksSolo() {
        var bus = trackSelected();
        bus.send(new EncoderButtonPressed(16));
        assertTrue(bus.events.contains(new RequestToggleSolo(TRACK_ID, "di (1)")));
    }

    @Test
    void encoder16IsLeftAloneWhileADeviceBorrowsTheEncoders() {
        var bus = trackSelected();
        bus.send(new DeviceGrabbed("amp"));
        bus.events.clear();
        bus.send(new VolumeUpdated(TRACK_ID, 0.5), new EncoderTurned(16, 10));
        assertNull(ringAt(bus, 16));
        assertFalse(bus.events.stream().anyMatch(e -> e instanceof SetTrackVolume));
    }
}
