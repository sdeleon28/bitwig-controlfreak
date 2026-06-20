package dev.tradcode.groupctl.mixmachine.frequalizer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.DeviceSelected;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerActivated;

class FrequalizerActivationCtlTest {

    private static final String FREQ = FrequalizerConstants.DEVICE_NAME;

    @Test
    void activatesWhenTheFrequalizerDevicePadIsPressed() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerActivationCtl(bus);

        bus.send(new DeviceSelected(FREQ));

        assertTrue(bus.last(FrequalizerActivated.class).active());
    }

    @Test
    void doesNotActivateWhenAnotherDeviceIsSelected() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerActivationCtl(bus);

        bus.send(new DeviceSelected("Pro-Q 3"));

        assertEquals(0, bus.count(FrequalizerActivated.class));
    }

    @Test
    void doesNotActivateMerelyBecauseATrackWasSelected() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerActivationCtl(bus);

        // Selecting a track whose focused device happens to be a FrequalizerAlt
        // must NOT wake the feature — only an explicit device-pad press does.
        bus.send(new BitwigTrackSelected(7));
        bus.send(new RequestSelectTrack(7, "bass (2)"));

        assertEquals(0, bus.count(FrequalizerActivated.class));
    }

    @Test
    void deactivatesWhenAnotherDeviceIsSelected() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerActivationCtl(bus);

        bus.send(new DeviceSelected(FREQ));
        bus.send(new DeviceSelected("Pro-Q 3"));

        assertFalse(bus.last(FrequalizerActivated.class).active());
    }

    @Test
    void deactivatesWhenANewTrackIsSelected() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerActivationCtl(bus);

        bus.send(new DeviceSelected(FREQ));
        bus.send(new RequestSelectTrack(9, "drums (3)"));

        assertFalse(bus.last(FrequalizerActivated.class).active());
    }

    @Test
    void reselectingTheSameFrequalizerDeviceDoesNotReBroadcast() {
        FakeEventBus bus = new FakeEventBus();
        new FrequalizerActivationCtl(bus);

        bus.send(new DeviceSelected(FREQ));
        bus.send(new DeviceSelected(FREQ));

        assertEquals(1, bus.count(FrequalizerActivated.class));
    }
}
