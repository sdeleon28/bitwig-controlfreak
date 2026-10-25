package dev.tradcode.groupctl.setlistexplorer;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * Song stepping from the Twister alone. The reducer still tracks the current
 * song and seeks to it, but never paints: no page is ever selected.
 */
public class SetlistExplorerLive {
    public SetlistExplorerLive(IEventBus bus, ControllerHost host) {
        new SetlistGridCalculator(bus);
        new TwisterSongPagerCtl(bus);
        new SetlistGrowler(bus, host);
    }
}
