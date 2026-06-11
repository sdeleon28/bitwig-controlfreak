package dev.tradcode.groupctl;

import com.bitwig.extension.api.util.midi.ShortMidiMessage;
import com.bitwig.extension.callback.ShortMidiMessageReceivedCallback;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;
import com.bitwig.extension.controller.ControllerExtension;

import dev.tradcode.groupctl.events.EventBus;
import dev.tradcode.groupctl.events.IEventBus;

public class GroupCtlExtension extends ControllerExtension
{
   BitwigSchemaTracker schemaTracker;
   BitwigDevicesTracker devicesTracker;
   BitwigFxTracker fxTracker;
   BitwigVolPanTracker volumeTracker;
   BitwigSendsTracker sendsTracker;
   IEventBus eventBus;
   Logger logger;
   LaunchpadInput launchpadIn;
   LaunchpadOutput launchpadOut;
   TwisterInput twisterIn;
   TwisterOutput twisterOut;
   Growler growler;
   LaunchpadGroupCtl launchpadGroupCtl;
   LaunchpadTrackCtl launchpadTrackCtl;
   LaunchpadDeviceCtl launchpadDeviceCtl;
   LaunchpadFxCtl launchpadFxCtl;
   TwisterDeviceCtl twisterDeviceCtl;
   TwisterVolPanCtl twisterVolPanCtl;
   TwisterSendTracksToFxCtl twisterSendTracksToFxCtl;
   Pager pager;
   VolPanCtl volPanCtl;
   PadModeCtl padModeCtl;

   protected GroupCtlExtension(final GroupCtlExtensionDefinition definition, final ControllerHost host)
   {
      super(definition, host);
   }

   @Override
   public void init()
   {
      final ControllerHost host = getHost();      

      mTransport = host.createTransport();
      host.getMidiInPort(0).setMidiCallback((ShortMidiMessageReceivedCallback)msg -> onMidi0(msg));
      host.getMidiInPort(0).setSysexCallback((String data) -> onSysex0(data));
      host.getMidiInPort(1).setMidiCallback((ShortMidiMessageReceivedCallback)msg -> onMidi1(msg));
      host.getMidiInPort(1).setSysexCallback((String data) -> onSysex1(data));

      eventBus = new EventBus();

      logger = new Logger(eventBus, host);
      schemaTracker = new BitwigSchemaTracker(host, eventBus);
      devicesTracker = new BitwigDevicesTracker(eventBus, host);
      fxTracker = new BitwigFxTracker(eventBus, host);
      volumeTracker = new BitwigVolPanTracker(host, eventBus);
      sendsTracker = new BitwigSendsTracker(eventBus, host);
      launchpadIn = new LaunchpadInput(eventBus, host.getMidiInPort(0));
      launchpadOut = new LaunchpadOutput(eventBus, host.getMidiOutPort(0));
      twisterIn = new TwisterInput(eventBus, host.getMidiInPort(1));
      twisterOut = new TwisterOutput(eventBus, host.getMidiOutPort(1));
      growler = new Growler(eventBus, host);
      launchpadGroupCtl = new LaunchpadGroupCtl(eventBus);
      launchpadTrackCtl = new LaunchpadTrackCtl(eventBus);
      launchpadDeviceCtl = new LaunchpadDeviceCtl(eventBus);
      launchpadFxCtl = new LaunchpadFxCtl(eventBus);
      twisterDeviceCtl = new TwisterDeviceCtl(eventBus);
      twisterVolPanCtl = new TwisterVolPanCtl(eventBus);
      twisterSendTracksToFxCtl = new TwisterSendTracksToFxCtl(eventBus);
      pager = new Pager(eventBus);
      volPanCtl = new VolPanCtl(eventBus);
      padModeCtl = new PadModeCtl(eventBus);

      host.showPopupNotification("GroupCtl Initialized");
   }

   @Override
   public void exit()
   {
      launchpadOut.clear();
      twisterOut.clear();
      getHost().showPopupNotification("GroupCtl Exited");
   }

   @Override
   public void flush()
   {
       schemaTracker.flush();
       volumeTracker.flush();
       devicesTracker.flush();
       fxTracker.flush();
       sendsTracker.flush();
   }

   /** Called when we receive short MIDI message on port 0. */
   private void onMidi0(ShortMidiMessage msg) 
   {
   }

   /** Called when we receive sysex MIDI message on port 0. */
   private void onSysex0(final String data) 
   {
      // MMC Transport Controls:
      if (data.equals("f07f7f0605f7"))
            mTransport.rewind();
      else if (data.equals("f07f7f0604f7"))
            mTransport.fastForward();
      else if (data.equals("f07f7f0601f7"))
            mTransport.stop();
      else if (data.equals("f07f7f0602f7"))
            mTransport.play();
      else if (data.equals("f07f7f0606f7"))
            mTransport.record();
   }

   private void onMidi1(ShortMidiMessage msg) 
   {
   }

   private void onSysex1(final String data) 
   {
   }

   private Transport mTransport;
}
