package dev.tradcode.groupctl.mixmachine.uidevice;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.BlinkSideButton;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceExistsChanged;
import dev.tradcode.groupctl.mixmachine.events.CursorDeviceNameChanged;
import dev.tradcode.groupctl.mixmachine.events.DeviceGrabbed;

class LaunchpadUiDeviceCtlTest {

    private static final int WHITE = 3;

    private static void uiDevice(FakeEventBus bus, String name) {
        bus.send(new CursorDeviceNameChanged(name));
        bus.send(new CursorDeviceExistsChanged(true));
    }

    @Test
    void pressWithoutDeviceGrabsNothing() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadUiDeviceCtl(bus);

        bus.send(new SideButtonClick(SideButton.SEND_B));

        assertNull(bus.last(DeviceGrabbed.class),
            "Send B cannot grab while no device is selected in the UI");
    }

    @Test
    void deviceInUiBlinksSendB() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadUiDeviceCtl(bus);

        uiDevice(bus, "Compressor");

        var blink = bus.last(BlinkSideButton.class);
        assertNotNull(blink);
        assertEquals(SideButton.SEND_B, blink.btn());
        assertEquals(WHITE, blink.color());
    }

    @Test
    void pressGrabsTheUiSelectedDevice() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadUiDeviceCtl(bus);
        uiDevice(bus, "Compressor");
        bus.clear();

        bus.send(new SideButtonClick(SideButton.SEND_B));

        var grabbed = bus.last(DeviceGrabbed.class);
        assertNotNull(grabbed, "Send B grabs the UI-selected device");
        assertEquals("Compressor", grabbed.name());
        var paint = bus.last(PaintSideButton.class);
        assertNotNull(paint);
        assertEquals(SideButton.SEND_B, paint.btn());
        assertEquals(WHITE, paint.color(), "a grabbed device lights Send B solid white");
    }

    @Test
    void grabbingViaPadAlsoLightsSendBSolid() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadUiDeviceCtl(bus);
        uiDevice(bus, "Compressor");
        bus.clear();

        // a device pad emits the same event; the button reflects the grab
        bus.send(new DeviceGrabbed("Compressor"));

        var paint = bus.last(PaintSideButton.class);
        assertNotNull(paint);
        assertEquals(WHITE, paint.color());
    }

    @Test
    void selectionReturnsToBlink() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadUiDeviceCtl(bus);
        uiDevice(bus, "Compressor");
        bus.send(new DeviceGrabbed("Compressor"));
        bus.clear();

        bus.send(new BitwigTrackSelected(7));

        var blink = bus.last(BlinkSideButton.class);
        assertNotNull(blink, "releasing the grab returns Send B to blinking (device still in UI)");
        assertEquals(WHITE, blink.color());
    }

    @Test
    void losingTheDeviceDarkensSendB() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadUiDeviceCtl(bus);
        uiDevice(bus, "Compressor");
        bus.clear();

        bus.send(new CursorDeviceExistsChanged(false));

        var paint = bus.last(PaintSideButton.class);
        assertNotNull(paint);
        assertEquals(0, paint.color(), "with no device the Send B button goes dark");
    }

    @Test
    void pressIgnoredOffTheGroupPage() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadUiDeviceCtl(bus);
        uiDevice(bus, "Compressor");
        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.clear();

        bus.send(new SideButtonClick(SideButton.SEND_B));

        assertNull(bus.last(DeviceGrabbed.class),
            "Send B belongs to other features off the group page");
    }

    @Test
    void selectingAnotherDeviceInTheUiReturnsToBlink() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadUiDeviceCtl(bus);
        uiDevice(bus, "Archetype Gojira X");
        bus.send(new DeviceGrabbed("Archetype Gojira X"));
        bus.clear();

        bus.send(new CursorDeviceNameChanged("Frequalizer"));

        assertNotNull(bus.last(BlinkSideButton.class));
        assertNull(bus.last(PaintSideButton.class));
    }

    @Test
    void grabbingTheUiDeviceAgainLightsSendBSolid() {
        FakeEventBus bus = new FakeEventBus();
        new LaunchpadUiDeviceCtl(bus);
        uiDevice(bus, "Archetype Gojira X");
        bus.send(new DeviceGrabbed("Archetype Gojira X"));
        bus.send(new CursorDeviceNameChanged("Frequalizer"));
        bus.clear();

        bus.send(new DeviceGrabbed("Frequalizer"), new CursorDeviceNameChanged("Frequalizer"));

        assertEquals(WHITE, bus.last(PaintSideButton.class).color());
        assertNull(bus.last(BlinkSideButton.class));
    }
}
