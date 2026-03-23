# iPhone Drummer

8x8 MIDI pad grid for iOS. Sends MIDI over the network via RTP-MIDI.

## Mac MIDI Setup

To receive MIDI on your Mac, open **Audio MIDI Setup** (`/Applications/Utilities/`), press `Cmd+2` to open MIDI Studio, double-click the **Network** icon, and enable a session under "My Sessions". When the iPhone app is running on the same network, it will appear in the Directory — select it and click **Connect**.

## Commands

```
just rebuild   # clean + configure + build + deploy to device
just log       # launch app on device with console output
just help      # show available commands
```
