package dev.tradcode.groupctl;
import java.util.UUID;

import com.bitwig.extension.api.PlatformType;
import com.bitwig.extension.controller.AutoDetectionMidiPortNamesList;
import com.bitwig.extension.controller.ControllerExtensionDefinition;
import com.bitwig.extension.controller.api.ControllerHost;

public class GroupCtlExtensionDefinition extends ControllerExtensionDefinition
{
   private static final UUID DRIVER_ID = UUID.fromString("5b43426d-16cf-4beb-b6bd-d54859059291");
   
   public GroupCtlExtensionDefinition()
   {
   }

   @Override
   public String getName()
   {
      return "GroupCtl";
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
      return "GroupCtl";
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
      return 2;
   }

   @Override
   public void listAutoDetectionMidiPortNames(final AutoDetectionMidiPortNamesList list, final PlatformType platformType)
   {
      if (platformType == PlatformType.WINDOWS)
      {
         // TODO: Set the correct names of the ports for auto detection on Windows platform here
         // and uncomment this when port names are correct.
         // list.add(new String[]{"Input Port 0", "Input Port 1"}, new String[]{"Output Port 0", "Output Port 1"});
      }
      else if (platformType == PlatformType.MAC)
      {
         // TODO: Set the correct names of the ports for auto detection on Windows platform here
         // and uncomment this when port names are correct.
         // list.add(new String[]{"Input Port 0", "Input Port 1"}, new String[]{"Output Port 0", "Output Port 1"});
      }
      else if (platformType == PlatformType.LINUX)
      {
         // TODO: Set the correct names of the ports for auto detection on Windows platform here
         // and uncomment this when port names are correct.
         // list.add(new String[]{"Input Port 0", "Input Port 1"}, new String[]{"Output Port 0", "Output Port 1"});
      }
   }

   @Override
   public GroupCtlExtension createInstance(final ControllerHost host)
   {
      return new GroupCtlExtension(this, host);
   }
}
