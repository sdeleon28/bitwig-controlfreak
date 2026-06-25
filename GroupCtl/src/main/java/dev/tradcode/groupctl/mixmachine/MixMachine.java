package dev.tradcode.groupctl.mixmachine;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.mixmachine.frequalizer.Frequalizer;
import dev.tradcode.groupctl.mixmachine.masterrc.MasterRc;

public class MixMachine {
    BitwigSchemaTracker schemaTracker;
    BitwigDevicesTracker devicesTracker;
    BitwigFxTracker fxTracker;
    BitwigVolPanTracker volumeTracker;
    BitwigSendsTracker sendsTracker;
    LaunchpadGroupCtl launchpadGroupCtl;
    LaunchpadTrackCtl launchpadTrackCtl;
    LaunchpadDeviceCtl launchpadDeviceCtl;
    LaunchpadFxCtl launchpadFxCtl;
    TwisterDeviceCtl twisterDeviceCtl;
    TwisterVolPanCtl twisterVolPanCtl;
    TwisterSendTracksToFxCtl twisterSendTracksToFxCtl;
    TwisterSendTrackToAllFxCtl twisterSendTrackToAllFxCtl;
    VolPanCtl volPanCtl;
    PadModeCtl padModeCtl;
    ClearActionsCtl clearActionsCtl;
    MixMachineGrowler growler;
    Frequalizer frequalizer;
    MasterRc masterRc;

    public MixMachine(IEventBus bus, ControllerHost host) {
        schemaTracker = new BitwigSchemaTracker(host, bus);
        devicesTracker = new BitwigDevicesTracker(bus, host);
        fxTracker = new BitwigFxTracker(bus, host);
        volumeTracker = new BitwigVolPanTracker(host, bus);
        sendsTracker = new BitwigSendsTracker(bus, host);
        launchpadGroupCtl = new LaunchpadGroupCtl(bus);
        launchpadTrackCtl = new LaunchpadTrackCtl(bus);
        launchpadDeviceCtl = new LaunchpadDeviceCtl(bus);
        launchpadFxCtl = new LaunchpadFxCtl(bus);
        twisterDeviceCtl = new TwisterDeviceCtl(bus);
        twisterVolPanCtl = new TwisterVolPanCtl(bus);
        twisterSendTracksToFxCtl = new TwisterSendTracksToFxCtl(bus);
        twisterSendTrackToAllFxCtl = new TwisterSendTrackToAllFxCtl(bus);
        volPanCtl = new VolPanCtl(bus);
        padModeCtl = new PadModeCtl(bus);
        clearActionsCtl = new ClearActionsCtl(bus);
        growler = new MixMachineGrowler(bus, host);
        frequalizer = new Frequalizer(bus, host);
        masterRc = new MasterRc(bus, host);
    }

    public void flush() {
        schemaTracker.flush();
        volumeTracker.flush();
        devicesTracker.flush();
        fxTracker.flush();
        sendsTracker.flush();
        frequalizer.flush();
    }
}
