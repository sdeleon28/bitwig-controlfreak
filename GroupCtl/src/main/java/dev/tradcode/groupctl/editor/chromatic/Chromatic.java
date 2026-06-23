package dev.tradcode.groupctl.editor.chromatic;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * Package entrypoint for the default chromatic mapping. It is just another
 * mapper package, unaware of the custom ones; dropping its construction leaves
 * the editor blank for any track no custom mapper claims.
 */
public class Chromatic {
    public Chromatic(IEventBus bus) {
        new ChromaticMapper(bus);
    }
}
