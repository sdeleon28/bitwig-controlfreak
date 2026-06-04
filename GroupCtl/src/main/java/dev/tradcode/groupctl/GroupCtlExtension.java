package dev.tradcode.groupctl;

import com.bitwig.extension.api.util.midi.ShortMidiMessage;
import com.bitwig.extension.callback.ShortMidiMessageReceivedCallback;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;
import com.bitwig.extension.controller.ControllerExtension;

import dev.tradcode.groupctl.events.EventBus;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PaintPad;
import dev.tradcode.groupctl.events.SetEncoderValue;

public class GroupCtlExtension extends ControllerExtension
{
   BitwigSchemaTracker schemaTracker;
   IEventBus eventBus;
   Logger logger;
   LaunchpadInput launchpadIn;
   LaunchpadOutput launchpadOut;
   TwisterInput twisterIn;
   TwisterOutput twisterOut;
   Growler growler;
   LaunchpadGroupCtl groupCtl;

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
      launchpadIn = new LaunchpadInput(eventBus, host.getMidiInPort(0));
      launchpadOut = new LaunchpadOutput(eventBus, host.getMidiOutPort(0));
      twisterIn = new TwisterInput(eventBus, host.getMidiInPort(1));
      twisterOut = new TwisterOutput(eventBus, host.getMidiOutPort(1));
      growler = new Growler(eventBus, host);
      groupCtl = new LaunchpadGroupCtl(eventBus);

      eventBus.send(new PaintPad(55, 60));
      eventBus.send(new PaintEncoder(5, 108));
      eventBus.send(new PaintEncoder(6, 108));
      eventBus.send(new PaintEncoder(7, 108));
      eventBus.send(new PaintEncoder(8, 108));

      eventBus.send(new SetEncoderValue(5, 10));
      eventBus.send(new SetEncoderValue(6, 50));
      eventBus.send(new SetEncoderValue(7, 80));
      eventBus.send(new SetEncoderValue(8, 127));

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
