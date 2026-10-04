package dev.tradcode.groupctl.mixmachine.devicewindow;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.mixmachine.devicewindow.events.RequestFocusCursorDeviceWindow;
import dev.tradcode.groupctl.mixmachine.devicewindow.events.RequestFocusDeviceWindow;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceNameChanged;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;

class DeviceWindowCtlTest {
    static final String AMP = "Archetype Gojira X";

    static FakeEventBus rig() {
        var bus = new FakeEventBus();
        new DeviceWindowCtl(bus);
        return bus;
    }

    static List<Event> focuses(FakeEventBus bus) {
        return bus.events.stream()
            .filter(e -> e instanceof RequestFocusDeviceWindow || e instanceof RequestFocusCursorDeviceWindow)
            .toList();
    }

    @Test
    void aPadGrabFocusesThatSlotOnTheSelectedTrack() {
        var bus = rig();
        bus.send(new BitwigTrackSelected(5), new RequestSelectDevice(2), new DeviceGrabbed("Frequalizer"));
        assertEquals(List.of(new RequestFocusDeviceWindow(5, 2)), focuses(bus));
    }

    @Test
    void switchingToneFocusesTheNewTracksAmpEvenWhileTheCursorStillShowsTheOldOne() {
        var bus = rig();
        bus.send(new CursorDeviceNameChanged(AMP));
        bus.send(new BitwigTrackSelected(5), new RequestSelectDevice(1), new DeviceGrabbed(AMP));
        bus.send(new BitwigTrackSelected(6), new RequestSelectDevice(1), new DeviceGrabbed(AMP));
        assertEquals(
            List.of(new RequestFocusDeviceWindow(5, 1), new RequestFocusDeviceWindow(6, 1)),
            focuses(bus));
    }

    @Test
    void aSendBGrabFocusesTheCursorDevice() {
        var bus = rig();
        bus.send(new BitwigTrackSelected(5), new DeviceGrabbed("Nested EQ"));
        assertEquals(List.of(new RequestFocusCursorDeviceWindow()), focuses(bus));
    }

    @Test
    void aPadSlotIsNotReusedByALaterSendBGrab() {
        var bus = rig();
        bus.send(new BitwigTrackSelected(5), new RequestSelectDevice(2), new DeviceGrabbed("Frequalizer"));
        bus.events.clear();
        bus.send(new DeviceGrabbed("Nested EQ"));
        assertEquals(List.of(new RequestFocusCursorDeviceWindow()), focuses(bus));
    }
}
