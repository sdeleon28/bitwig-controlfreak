package dev.tradcode.groupctl.mixmachine.devicedetail;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.devicedetail.events.DeviceEnabledChanged;
import dev.tradcode.groupctl.mixmachine.devicedetail.events.RequestToggleDevice;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;

class LaunchpadDeviceToggleCtlTest {

    static final int PAD = 88;
    static final int GOLD = 99;
    static final int OFF = 0;

    private static Integer lastPadColor(FakeEventBus bus) {
        Integer color = null;
        for (var e : bus.events)
            if (e instanceof PaintPad p && p.n() == PAD) color = p.color();
        return color;
    }

    private static boolean toggleRequested(FakeEventBus bus) {
        return bus.events.stream().anyMatch(e -> e instanceof RequestToggleDevice);
    }

    @Test
    void enabledGenericDevicePaintsGold() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadDeviceToggleCtl(bus);

        bus.send(new DeviceGrabbed("Compressor"));
        bus.send(new DeviceEnabledChanged(true));

        assertEquals(GOLD, lastPadColor(bus));
    }

    @Test
    void disabledGenericDeviceStaysDark() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadDeviceToggleCtl(bus);

        bus.send(new DeviceGrabbed("Compressor"));
        bus.send(new DeviceEnabledChanged(false));

        assertEquals(OFF, lastPadColor(bus));
    }

    @Test
    void togglingOffRepaintsDark() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadDeviceToggleCtl(bus);
        bus.send(new DeviceGrabbed("Compressor"));
        bus.send(new DeviceEnabledChanged(true));

        bus.send(new DeviceEnabledChanged(false));

        assertEquals(OFF, lastPadColor(bus));
    }

    @Test
    void clickTogglesGrabbedDevice() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadDeviceToggleCtl(bus);
        bus.send(new DeviceGrabbed("Compressor"));

        bus.send(new PadClicked(PAD));

        assertTrue(toggleRequested(bus));
    }

    @Test
    void clickIgnoredWithoutDeviceMode() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadDeviceToggleCtl(bus);

        bus.send(new PadClicked(PAD));

        assertFalse(toggleRequested(bus));
    }

    @Test
    void customMappedDeviceDoesNotActivate() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadDeviceToggleCtl(bus);

        bus.send(new DeviceGrabbed("Frequalizer Alt"));
        bus.send(new PadClicked(PAD));

        assertFalse(toggleRequested(bus),
            "the toggle must stay out of a device with its own controller");
    }

    @Test
    void selectingTrackReleasesPad() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadDeviceToggleCtl(bus);
        bus.send(new DeviceGrabbed("Compressor"));
        bus.send(new DeviceEnabledChanged(true));

        bus.send(new RequestSelectTrack(11, "di (1)"));

        assertEquals(OFF, lastPadColor(bus), "leaving device mode clears the pad");
        bus.clear();
        bus.send(new PadClicked(PAD));
        assertFalse(toggleRequested(bus));
    }

    @Test
    void clickIgnoredOffGroupPage() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadDeviceToggleCtl(bus);
        bus.send(new DeviceGrabbed("Compressor"));

        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.send(new PadClicked(PAD));

        assertFalse(toggleRequested(bus));
    }

    @Test
    void returningToGroupPageRestoresGold() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadDeviceToggleCtl(bus);
        bus.send(new DeviceGrabbed("Compressor"));
        bus.send(new DeviceEnabledChanged(true));
        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.clear();

        bus.send(new PageSelected(Page.GROUPCTL.getValue()));

        assertEquals(GOLD, lastPadColor(bus));
    }
}
