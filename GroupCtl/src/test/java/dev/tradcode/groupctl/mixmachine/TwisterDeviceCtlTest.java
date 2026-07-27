package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.RcExistsChanged;
import dev.tradcode.groupctl.mixmachine.events.SetRcValue;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
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
}
