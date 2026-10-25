package dev.tradcode.groupctl.mixmachine;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.mixmachine.devicewindow.DeviceWindow;
import dev.tradcode.groupctl.mixmachine.frequalizer.FrequalizerLive;
import dev.tradcode.groupctl.mixmachine.masterrc.MasterRcLive;
import dev.tradcode.groupctl.mixmachine.trackrc.TrackRc;
import dev.tradcode.groupctl.mixmachine.uidevice.UiDeviceLive;

/**
 * The Twister programs of {@link MixMachine} that Bitwig's own selection can
 * engage: group vol/pan, track RCs, master RCs, and device RCs / Frequalizer
 * through the UI-device grab. The FX send programs are left out because only
 * the Launchpad's FX pads can engage them.
 */
public class MixMachineLive {
    BitwigSchemaTracker schemaTracker;
    BitwigDevicesTracker devicesTracker;
    BitwigVolPanTracker volumeTracker;
    FrequalizerLive frequalizer;

    public MixMachineLive(IEventBus bus, ControllerHost host) {
        this.schemaTracker = new BitwigSchemaTracker(host, bus);
        this.devicesTracker = new BitwigDevicesTracker(bus, host);
        this.volumeTracker = new BitwigVolPanTracker(host, bus);
        new TwisterDeviceCtl(bus);
        new TwisterVolPanCtl(bus);
        new MixMachineGrowler(bus, host);
        this.frequalizer = new FrequalizerLive(bus, host);
        new MasterRcLive(bus, host);
        new TrackRc(bus, host);
        new UiDeviceLive(bus);
        new DeviceWindow(bus, host);
    }

    public void flush() {
        this.schemaTracker.flush();
        this.volumeTracker.flush();
        this.devicesTracker.flush();
        this.frequalizer.flush();
    }
}
