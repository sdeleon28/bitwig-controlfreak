package dev.tradcode.groupctl.editor.ggd;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * Package entrypoint for the GGD drum mapping. Constructing it plugs the mapping
 * into the editor; deleting the single call that does so removes the feature
 * whole, leaving the default mapping to cover every track.
 */
public class Ggd {
    public Ggd(IEventBus bus) {
        new GgdMapper(bus);
    }
}
