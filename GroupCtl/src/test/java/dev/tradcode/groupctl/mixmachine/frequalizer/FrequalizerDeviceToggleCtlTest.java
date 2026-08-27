package dev.tradcode.groupctl.mixmachine.frequalizer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.PadClicked;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerDeviceEnabledChanged;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.RequestToggleFrequalizerDevice;

class FrequalizerDeviceToggleCtlTest {

    // Local pad 16 of the top-right quadrant (origin note 55).
    static final int PAD = 88;

    private static Integer lastPadColor(FakeEventBus bus) {
        Integer color = null;
        for (var e : bus.events)
            if (e instanceof PaintPad p && p.n() == PAD) color = p.color();
        return color;
    }

    private static boolean toggleRequested(FakeEventBus bus) {
        return bus.events.stream().anyMatch(e -> e instanceof RequestToggleFrequalizerDevice);
    }

    @Test
    void paintsGoldWhileTheDeviceIsEnabled() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerDeviceToggleCtl(bus);

        bus.send(new FrequalizerActivated(true));
        bus.send(new FrequalizerDeviceEnabledChanged(true));

        assertEquals(FrequalizerColors.DEVICE_ON, lastPadColor(bus));
    }

    @Test
    void paintsDarkWhileTheDeviceIsDisabled() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerDeviceToggleCtl(bus);
        bus.send(new FrequalizerActivated(true));
        bus.send(new FrequalizerDeviceEnabledChanged(true));

        bus.send(new FrequalizerDeviceEnabledChanged(false));

        assertEquals(FrequalizerColors.DEVICE_OFF, lastPadColor(bus));
    }

    @Test
    void paintsTheStateItWasHoldingOnActivation() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerDeviceToggleCtl(bus);
        bus.send(new FrequalizerDeviceEnabledChanged(true));
        bus.clear();

        bus.send(new FrequalizerActivated(true));

        assertEquals(FrequalizerColors.DEVICE_ON, lastPadColor(bus));
    }

    @Test
    void clickTogglesTheDevice() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerDeviceToggleCtl(bus);
        bus.send(new FrequalizerActivated(true));

        bus.send(new PadClicked(PAD));

        assertTrue(toggleRequested(bus));
    }

    @Test
    void otherQuadrantPadsAreNotTheToggle() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerDeviceToggleCtl(bus);
        bus.send(new FrequalizerActivated(true));

        bus.send(new PadClicked(75));

        assertFalse(toggleRequested(bus));
    }

    @Test
    void clickIgnoredOutsideFrequalizerMode() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerDeviceToggleCtl(bus);

        bus.send(new PadClicked(PAD));

        assertFalse(toggleRequested(bus));
    }

    @Test
    void yieldsWithoutBlankingWhenTheFrequalizerIsReleased() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerDeviceToggleCtl(bus);
        bus.send(new FrequalizerActivated(true));
        bus.send(new FrequalizerDeviceEnabledChanged(true));
        bus.clear();

        bus.send(new FrequalizerActivated(false));

        assertNull(lastPadColor(bus), "the pad belongs to whoever takes the quadrant next");
        bus.clear();
        bus.send(new PadClicked(PAD));
        assertFalse(toggleRequested(bus));
    }

    @Test
    void staysQuietOffTheGroupPage() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerDeviceToggleCtl(bus);
        bus.send(new FrequalizerActivated(true));
        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.clear();

        bus.send(new FrequalizerDeviceEnabledChanged(true));

        assertNull(lastPadColor(bus));
        bus.send(new PadClicked(PAD));
        assertFalse(toggleRequested(bus));
    }

    @Test
    void repaintsWhenTheGroupPageComesBack() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerDeviceToggleCtl(bus);
        bus.send(new FrequalizerActivated(true));
        bus.send(new FrequalizerDeviceEnabledChanged(true));
        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.clear();

        bus.send(new PageSelected(Page.GROUPCTL.getValue()));

        assertEquals(FrequalizerColors.DEVICE_ON, lastPadColor(bus));
    }
}
