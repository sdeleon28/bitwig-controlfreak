package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.events.SetRcValue;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;

class TwisterDeviceCtlTest {

    private static boolean wroteRc(FakeEventBus bus) {
        return bus.events.stream().anyMatch(e -> e instanceof SetRcValue);
    }

    @Test
    void encoderTurnIgnoredUntilDeviceSelected() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void encoderTurnWritesRcAfterDeviceSelected() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new RequestSelectDevice(0));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertTrue(wroteRc(bus));
    }

    @Test
    void editorPageSuppressesEncodersThenRestores() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);
        bus.send(new RequestSelectDevice(0));

        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));
        assertFalse(wroteRc(bus), "RC turns must not fire while the editor owns the Twister");

        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.send(new EncoderTurned(1, 127));
        assertTrue(wroteRc(bus), "leaving the editor page restores RC control");
    }

    @Test
    void fxPadPressReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new RequestSelectDevice(0));
        bus.send(new RequestFxSelectTrack(0, "verb"));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void trackSelectionReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new RequestSelectDevice(0));
        bus.send(new RequestSelectTrack(11, "di (1)"));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void groupSelectionReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);

        bus.send(new RequestSelectDevice(0));
        bus.send(new BitwigTrackSelected(10));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus));
    }
}
