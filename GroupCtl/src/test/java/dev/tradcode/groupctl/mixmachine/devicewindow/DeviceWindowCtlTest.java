package dev.tradcode.groupctl.mixmachine.devicewindow;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.mixmachine.devicewindow.events.RequestFocusDeviceWindow;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceNameChanged;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;

class DeviceWindowCtlTest {
    static FakeEventBus rig() {
        var bus = new FakeEventBus();
        new DeviceWindowCtl(bus);
        return bus;
    }

    static long focuses(FakeEventBus bus) {
        return bus.events.stream().filter(RequestFocusDeviceWindow.class::isInstance).count();
    }

    @Test
    void grabbingTheDeviceAlreadyUnderTheCursorFocusesItsWindow() {
        var bus = rig();
        bus.send(new CursorDeviceNameChanged("Frequalizer"), new DeviceGrabbed("Frequalizer"));
        assertEquals(1, focuses(bus));
    }

    @Test
    void aPadGrabWaitsForTheCursorToReachTheDevice() {
        var bus = rig();
        bus.send(new CursorDeviceNameChanged("Archetype Gojira X"), new DeviceGrabbed("Frequalizer"));
        assertEquals(0, focuses(bus));
        bus.send(new CursorDeviceNameChanged("Frequalizer"));
        assertEquals(1, focuses(bus));
    }

    @Test
    void movingTheCursorAroundLaterDoesNotFocusAgain() {
        var bus = rig();
        bus.send(new CursorDeviceNameChanged("Frequalizer"), new DeviceGrabbed("Frequalizer"));
        bus.send(new CursorDeviceNameChanged("Tuner"), new CursorDeviceNameChanged("Frequalizer"));
        assertEquals(1, focuses(bus));
    }
}
