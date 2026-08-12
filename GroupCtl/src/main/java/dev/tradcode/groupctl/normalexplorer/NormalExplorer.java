package dev.tradcode.groupctl.normalexplorer;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * The normal (whole-project) explorer view. Built on top of {@code BaseExplorer}
 * (trackers, painter, shared controls); it adds only its own reducer and the
 * project-paging LEDs. Engages when the project has no {@code { }} setlist.
 */
public class NormalExplorer {
    public NormalExplorer(IEventBus bus) {
        new NormalGridCalculator(bus);
        new ExplorerPageCtl(bus);
    }
}
