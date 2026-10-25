package dev.tradcode.groupctl.live;

import com.bitwig.extension.controller.ControllerExtension;
import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.Logger;
import dev.tradcode.groupctl.TwisterInput;
import dev.tradcode.groupctl.TwisterOutput;
import dev.tradcode.groupctl.baseexplorer.BaseExplorerLive;
import dev.tradcode.groupctl.events.EventBus;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.guitarinput.GuitarInput;
import dev.tradcode.groupctl.mixmachine.MixMachineLive;
import dev.tradcode.groupctl.programchange.ProgramChange;
import dev.tradcode.groupctl.setlistexplorer.SetlistExplorerLive;
import dev.tradcode.groupctl.tones.TonesLive;
import dev.tradcode.groupctl.transpose.Transpose;

/**
 * GroupCtl for the stage: the Twister is the only surface, Bitwig's selection
 * picks the Twister program, and program changes launch songs.
 */
public class GroupCtlLiveExtension extends ControllerExtension
{
   static final int TWISTER_PORT = 0;
   static final int PROGRAM_CHANGE_PORT = 1;

   TwisterOutput twisterOut;
   BaseExplorerLive baseExplorer;
   MixMachineLive mixMachine;
   Transpose transpose;

   protected GroupCtlLiveExtension(final GroupCtlLiveExtensionDefinition definition, final ControllerHost host)
   {
      super(definition, host);
   }

   @Override
   public void init()
   {
      final ControllerHost host = getHost();
      final IEventBus eventBus = new EventBus();

      new Logger(eventBus, host);
      new TwisterInput(eventBus, host.getMidiInPort(TWISTER_PORT));
      twisterOut = new TwisterOutput(eventBus, host.getMidiOutPort(TWISTER_PORT));
      twisterOut.clear();
      baseExplorer = new BaseExplorerLive(eventBus, host);
      new SetlistExplorerLive(eventBus, host);
      mixMachine = new MixMachineLive(eventBus, host);
      transpose = new Transpose(eventBus, host);
      new TonesLive(eventBus, host);
      new ProgramChange(eventBus, host, host.getMidiInPort(PROGRAM_CHANGE_PORT));
      new GuitarInput(eventBus, host);

      host.showPopupNotification("GroupCtl LIVE Initialized");
   }

   @Override
   public void exit()
   {
      twisterOut.clear();
      getHost().showPopupNotification("GroupCtl LIVE Exited");
   }

   @Override
   public void flush()
   {
      baseExplorer.flush();
      mixMachine.flush();
      transpose.flush();
   }
}
