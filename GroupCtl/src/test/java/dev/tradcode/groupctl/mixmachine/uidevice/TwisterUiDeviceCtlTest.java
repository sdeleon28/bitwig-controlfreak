package dev.tradcode.groupctl.mixmachine.uidevice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonChord;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceExistsChanged;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceNameChanged;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;

class TwisterUiDeviceCtlTest {
    static final TwisterSideButton BL = TwisterSideButton.BOTTOM_LEFT;
    static final TwisterSideButton BR = TwisterSideButton.BOTTOM_RIGHT;

    private static FakeEventBus withUiDevice(String name) {
        var bus = new FakeEventBus();
        new TwisterUiDeviceCtl(bus);
        bus.send(new CursorDeviceNameChanged(name), new CursorDeviceExistsChanged(true));
        return bus;
    }

    @Test
    void bottomChordGrabsTheUiSelectedDevice() {
        var bus = withUiDevice("Compressor");
        bus.send(new TwisterSideButtonChord(BR, BL));
        assertEquals("Compressor", bus.last(DeviceGrabbed.class).name());
    }

    @Test
    void grabsTheLatestUiDevice() {
        var bus = withUiDevice("Compressor");
        bus.send(new CursorDeviceNameChanged("EQ+"));
        bus.send(new TwisterSideButtonChord(BL, BR));
        assertEquals("EQ+", bus.last(DeviceGrabbed.class).name());
    }

    @Test
    void nothingToGrabWithoutAUiDevice() {
        var bus = withUiDevice("Compressor");
        bus.send(new CursorDeviceExistsChanged(false));
        bus.send(new TwisterSideButtonChord(BL, BR));
        assertNull(bus.last(DeviceGrabbed.class));
    }

    @Test
    void otherChordsDoNotGrab() {
        var bus = withUiDevice("Compressor");
        bus.send(
            new TwisterSideButtonChord(TwisterSideButton.TOP_LEFT, TwisterSideButton.TOP_RIGHT),
            new TwisterSideButtonChord(BL, TwisterSideButton.TOP_LEFT));
        assertNull(bus.last(DeviceGrabbed.class));
    }
}
