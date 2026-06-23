package dev.tradcode.groupctl.editor.ggd;

import dev.tradcode.groupctl.editor.EditorConstants;
import dev.tradcode.groupctl.editor.events.EditorClipTrackChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysProposed;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;

/**
 * Proposes the {@link GgdDrumMap} layout whenever the clip sits on a GGD track,
 * and withdraws when it does not. Because the two pages are fixed lookup tables
 * the mapper keys off the discrete page alone and ignores the vertical scroll,
 * so switching pages snaps rather than animates. It knows nothing of the other
 * mappers — its higher priority is what lets it win when both apply.
 */
public class GgdMapper implements IEventBusSubscriber {
    static final int PRIORITY = 100;
    static final int[] NONE = new int[0];

    IEventBus bus;
    boolean applicable = false;
    boolean topPage = false;

    public GgdMapper(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void propose() {
        this.bus.send(new EditorRowKeysProposed(PRIORITY, this.applicable,
            this.applicable ? GgdDrumMap.rowKeys(this.topPage) : NONE));
    }

    public void on(Event event) {
        switch (event) {
            case EditorClipTrackChanged(String trackName) -> {
                this.applicable = GgdDrumMap.matches(trackName);
                this.propose();
            }
            case PageSelected(int n) -> {
                this.topPage = n == EditorConstants.PAGE_INDEX;
                if (this.applicable)
                    this.propose();
            }
            default -> { }
        }
    }
}
