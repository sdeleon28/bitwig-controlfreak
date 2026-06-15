package dev.tradcode.groupctl.mixmachine;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.BitwigTrackSelected;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectDevice;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SetRcValue;

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
