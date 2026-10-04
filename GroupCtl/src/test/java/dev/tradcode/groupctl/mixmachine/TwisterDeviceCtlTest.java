package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.RcExistsChanged;
import dev.tradcode.groupctl.mixmachine.events.SetRcValue;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

import dev.tradcode.groupctl.Colors;
import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestToggleSolo;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.PanUpdated;
import dev.tradcode.groupctl.mixmachine.events.RcValueChanged;
import dev.tradcode.groupctl.mixmachine.events.SchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.SetTrackPan;
import dev.tradcode.groupctl.mixmachine.events.SetTrackVolume;
import dev.tradcode.groupctl.mixmachine.events.VolumeUpdated;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;

class TwisterDeviceCtlTest {

    private static boolean wroteRc(FakeEventBus bus) {
        return bus.events.stream().anyMatch(e -> e instanceof SetRcValue);
    }

    private static SetRcValue lastWrite(FakeEventBus bus) {
        SetRcValue last = null;
        for (var e : bus.events)
            if (e instanceof SetRcValue s) last = s;
        return last;
    }

    private static Integer ledAt(FakeEventBus bus, int pos) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof PaintEncoder pe && pe.n() == pos) last = pe.color();
        return last;
    }

    @Test
    void encoderTurnIgnoredUntilDeviceGrabbed() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void encoderTurnWritesRcAfterDeviceGrabbed() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new DeviceGrabbed("Compressor"));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertTrue(wroteRc(bus));
    }

    @Test
    void editorPageSuppressesEncodersThenRestores() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);
        bus.send(new DeviceGrabbed("Compressor"));

        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));
        assertFalse(wroteRc(bus), "RC turns must not fire while the editor owns the Twister");

        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.send(new EncoderTurned(1, 127));
        assertTrue(wroteRc(bus), "leaving the editor page restores RC control");
    }

    @Test
    void blacklistedDeviceDoesNotActivateRc() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new DeviceGrabbed("Frequalizer Alt"));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus), "RC must stay out of the way of a blacklisted device");
    }

    @Test
    void nonBlacklistedDeviceActivatesRc() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new DeviceGrabbed("Compressor"));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertTrue(wroteRc(bus));
    }

    @Test
    void fxPadPressReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new DeviceGrabbed("Compressor"));
        bus.send(new RequestFxSelectTrack(0, "verb"));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void trackSelectionReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new DeviceGrabbed("Compressor"));
        bus.send(new RequestSelectTrack(11, "di (1)"));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void groupSelectionReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new DeviceGrabbed("Compressor"));
        bus.send(new BitwigTrackSelected(10));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void secondPageRcExistenceLightsTheTopEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);
        bus.send(new DeviceGrabbed("Compressor"));
        bus.events.clear();

        // slot 8 (second page, param 0) maps to position 13
        bus.send(new RcExistsChanged(8, true));

        assertEquals(25, ledAt(bus, 13), "an existing second-page RC lights the top encoder");
    }

    @Test
    void absentSecondPageLeavesTheTopEncodersDark() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);
        bus.send(new DeviceGrabbed("Compressor"));
        bus.events.clear();

        bus.send(new RcExistsChanged(8, false));

        assertEquals(0, ledAt(bus, 13), "a device without a second page keeps the top encoders dark");
    }

    @Test
    void turningATopEncoderWritesTheSecondPageRc() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);
        bus.send(new DeviceGrabbed("Compressor"));
        bus.events.clear();

        // position 13 maps to slot 8
        bus.send(new EncoderTurned(13, 127));

        var write = lastWrite(bus);
        assertNotNull(write);
        assertEquals(8, write.n());
    }

    static final int TRACK_ID = 5;
    static final String TRACK_COLOR = "86,96,198";

    private static FakeEventBus ampGrabbedOnTrack() {
        var t = new BitwigTrack();
        t.id = TRACK_ID;
        t.name = "A (1)";
        t.color = TRACK_COLOR;
        t.children = new ArrayList<>();
        var schema = new ArrayList<BitwigTrack>();
        schema.add(t);
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);
        bus.send(new SchemaChanged(schema), new BitwigTrackSelected(TRACK_ID), new DeviceGrabbed("Archetype Gojira X"));
        return bus;
    }

    private static Integer ringAt(FakeEventBus bus, int pos) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof SetEncoderValue sv && sv.n() == pos) last = sv.v();
        return last;
    }

    @Test
    void encoder16IsLitInTheTrackColorWhileADeviceIsGrabbed() {
        var bus = ampGrabbedOnTrack();
        bus.send(new RcExistsChanged(SelectedTrackEncoder.SLOT, true));
        assertEquals(Colors.toTwister(TRACK_COLOR), ledAt(bus, 16));
    }

    @Test
    void encoder16RingFollowsTheTrackVolumeNotTheRc() {
        var bus = ampGrabbedOnTrack();
        bus.send(new VolumeUpdated(TRACK_ID, 0.5), new RcValueChanged(SelectedTrackEncoder.SLOT, 1.0));
        assertEquals(64, ringAt(bus, 16));
    }

    @Test
    void turningEncoder16SetsTrackVolumeOrPan() {
        var bus = ampGrabbedOnTrack();
        bus.send(new EncoderTurned(16, 127));
        assertTrue(bus.events.contains(new SetTrackVolume(TRACK_ID, 1.0)));
        bus.send(new PanModeSelected(), new EncoderTurned(16, 0));
        assertTrue(bus.events.contains(new SetTrackPan(TRACK_ID, 0.0)));
        assertFalse(wroteRc(bus));
    }

    @Test
    void inPanModeEncoder16ShowsThePan() {
        var bus = ampGrabbedOnTrack();
        bus.send(new PanUpdated(TRACK_ID, 1.0), new PanModeSelected());
        assertEquals(127, ringAt(bus, 16));
    }

    @Test
    void pressingEncoder16TogglesSolo() {
        var bus = ampGrabbedOnTrack();
        bus.send(new EncoderButtonPressed(16));
        assertTrue(bus.events.contains(new RequestToggleSolo(TRACK_ID, "A (1)")));
    }

    @Test
    void encoder16IsInertWithoutAGrabbedDevice() {
        var bus = ampGrabbedOnTrack();
        bus.send(new BitwigTrackSelected(TRACK_ID));
        bus.events.clear();
        bus.send(new EncoderTurned(16, 127), new EncoderButtonPressed(16), new VolumeUpdated(TRACK_ID, 0.3));
        assertTrue(bus.events.stream().noneMatch(e ->
            e instanceof SetTrackVolume || e instanceof RequestToggleSolo || e instanceof SetEncoderValue));
    }
}
