package dev.tradcode.groupctl;

import com.bitwig.extension.api.util.midi.ShortMidiMessage;
import com.bitwig.extension.callback.ShortMidiMessageReceivedCallback;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;
import com.bitwig.extension.controller.ControllerExtension;

import dev.tradcode.groupctl.editor.Editor;
import dev.tradcode.groupctl.events.EventBus;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.explorer.Explorer;
import dev.tradcode.groupctl.mixmachine.MixMachine;

public class GroupCtlExtension extends ControllerExtension
{
   IEventBus eventBus;
   Logger logger;
   LaunchpadInput launchpadIn;
   LaunchpadOutput launchpadOut;
   TwisterInput twisterIn;
   TwisterOutput twisterOut;
   PagerGrowler pagerGrowler;
   Pager pager;
   Explorer explorer;
   Editor editor;
   MixMachine mixMachine;
   PluginLogger pluginLogger;

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
      pluginLogger = new PluginLogger(eventBus, host);
      twisterIn = new TwisterInput(eventBus, host.getMidiInPort(1));
      twisterOut = new TwisterOutput(eventBus, host.getMidiOutPort(1));
      launchpadIn = new LaunchpadInput(eventBus, host.getMidiInPort(0), host);
      launchpadOut = new LaunchpadOutput(eventBus, host.getMidiOutPort(0));
      pager = new Pager(eventBus);
      pagerGrowler = new PagerGrowler(eventBus, host);
      explorer = new Explorer(eventBus, host);
      editor = new Editor(eventBus, host);
      mixMachine = new MixMachine(eventBus, host);

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
       explorer.flush();
       editor.flush();
       mixMachine.flush();
       pluginLogger.flush();
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
