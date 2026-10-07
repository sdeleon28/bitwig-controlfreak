package dev.tradcode.groupctl;

import com.bitwig.extension.api.util.midi.ShortMidiMessage;
import com.bitwig.extension.callback.ShortMidiMessageReceivedCallback;
import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.Transport;
import com.bitwig.extension.controller.ControllerExtension;

import dev.tradcode.groupctl.editor.Editor;
import dev.tradcode.groupctl.events.EventBus;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.baseexplorer.BaseExplorer;
import dev.tradcode.groupctl.normalexplorer.NormalExplorer;
import dev.tradcode.groupctl.setlistexplorer.SetlistExplorer;
import dev.tradcode.groupctl.mixmachine.MixMachine;
import dev.tradcode.groupctl.palette.Palette;
import dev.tradcode.groupctl.transpose.Transpose;
import dev.tradcode.groupctl.tones.Tones;
import dev.tradcode.groupctl.programchange.ProgramChange;

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
   BaseExplorer baseExplorer;
   NormalExplorer normalExplorer;
   SetlistExplorer setlistExplorer;
   Editor editor;
   MixMachine mixMachine;
   Palette palette;
   Transpose transpose;
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
      baseExplorer = new BaseExplorer(eventBus, host);
      normalExplorer = new NormalExplorer(eventBus);
      setlistExplorer = new SetlistExplorer(eventBus, host);
      editor = new Editor(eventBus, host);
      mixMachine = new MixMachine(eventBus, host);
      palette = new Palette(eventBus, host);
      transpose = new Transpose(eventBus, host);
      new Tones(eventBus, host);
      new ProgramChange(eventBus, host);

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
       baseExplorer.flush();
       editor.flush();
       mixMachine.flush();
       transpose.flush();
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
