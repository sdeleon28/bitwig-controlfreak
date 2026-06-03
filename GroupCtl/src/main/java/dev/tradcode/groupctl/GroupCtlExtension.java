package dev.tradcode.groupctl;

import com.bitwig.extension.api.util.midi.ShortMidiMessage;
import com.bitwig.extension.callback.ShortMidiMessageReceivedCallback;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;
import com.bitwig.extension.controller.ControllerExtension;

import dev.tradcode.groupctl.events.EventBus;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintPad;

public class GroupCtlExtension extends ControllerExtension
{
   BitwigSchemaTracker schemaTracker;
   IEventBus eventBus;
   Logger logger;
   LaunchpadOutput launchpadOut;
   LaunchpadInput launchpadIn;
   Growler growler;

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
      launchpadOut = new LaunchpadOutput(eventBus, host.getMidiOutPort(0));
      launchpadIn = new LaunchpadInput(eventBus, host.getMidiInPort(0));
      growler = new Growler(eventBus, host);
      eventBus.send(new PaintPad(55, 60));

      host.showPopupNotification("GroupCtl Initialized");
   }

   @Override
   public void exit()
   {
      getHost().showPopupNotification("GroupCtl Exited");
      launchpadOut.clear();
   }

   @Override
   public void flush()
   {
       schemaTracker.flush();
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
