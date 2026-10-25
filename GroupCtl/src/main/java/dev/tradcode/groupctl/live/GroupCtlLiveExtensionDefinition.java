package dev.tradcode.groupctl.live;

import java.util.UUID;

import com.bitwig.extension.api.PlatformType;
import com.bitwig.extension.controller.AutoDetectionMidiPortNamesList;
import com.bitwig.extension.controller.ControllerExtensionDefinition;
import com.bitwig.extension.controller.api.ControllerHost;

/**
 * Inputs: 0 = Twister, 1 = program change source. Output: 0 = Twister.
 */
public class GroupCtlLiveExtensionDefinition extends ControllerExtensionDefinition
{
   private static final UUID DRIVER_ID = UUID.fromString("d35a5406-f38c-49c7-b158-bb24e50cd258");

   @Override
   public String getName()
   {
      return "GroupCtl LIVE";
   }

   @Override
   public String getAuthor()
   {
      return "Santiago de León";
   }

   @Override
   public String getVersion()
   {
      return "0.1";
   }

   @Override
   public UUID getId()
   {
      return DRIVER_ID;
   }

   @Override
   public String getHardwareVendor()
   {
      return "tradcode.dev";
   }

   @Override
   public String getHardwareModel()
   {
      return "GroupCtl LIVE";
   }

   @Override
   public int getRequiredAPIVersion()
   {
      return 25;
   }

   @Override
   public int getNumMidiInPorts()
   {
      return 2;
   }

   @Override
   public int getNumMidiOutPorts()
   {
      return 1;
   }

   @Override
   public void listAutoDetectionMidiPortNames(final AutoDetectionMidiPortNamesList list, final PlatformType platformType)
   {
   }

   @Override
   public GroupCtlLiveExtension createInstance(final ControllerHost host)
   {
      return new GroupCtlLiveExtension(this, host);
   }
}
