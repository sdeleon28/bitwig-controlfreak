package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigDevice;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.DevicesSchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.events.SetRcValue;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
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

    private static BitwigDevice device(int id, String name) {
        var d = new BitwigDevice();
        d.id = id;
        d.name = name;
        d.exists = true;
        return d;
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
    void blacklistedDeviceDoesNotActivateRc() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);
        bus.send(new DevicesSchemaChanged(List.of(device(0, "Frequalizer Alt"))));

        bus.send(new RequestSelectDevice(0));
        bus.events.clear();
        bus.send(new EncoderTurned(1, 127));

        assertFalse(wroteRc(bus), "RC must stay out of the way of a blacklisted device");
    }

    @Test
    void nonBlacklistedDeviceActivatesRc() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterDeviceCtl(bus);
        bus.send(new DevicesSchemaChanged(List.of(device(0, "Compressor"))));

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
