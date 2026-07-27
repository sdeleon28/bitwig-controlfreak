package dev.tradcode.groupctl.mixmachine;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorRemoteControlsPage;
import com.bitwig.extension.controller.api.RemoteControl;

/**
 * A {@link CursorRemoteControlsPage} pinned to one fixed page index.
 *
 * Bitwig only keeps a page cursor on the index you set until the underlying
 * track or device changes, after which it drifts back towards page 0. Pinning a
 * page above 0 (so the top encoders can host the second remote-controls page)
 * therefore needs the index re-asserted whenever it slips — but only when the
 * device actually has that many pages, otherwise re-setting an out-of-range
 * index would loop forever against Bitwig clamping it back.
 */
public class PinnedRcPage {
    private static final int REPIN_DELAY_MS = 200;

    private final CursorRemoteControlsPage page;
    private final int index;
    private final ControllerHost host;

    public PinnedRcPage(CursorRemoteControlsPage page, int index, ControllerHost host) {
        this.page = page;
        this.index = index;
        this.host = host;
        page.selectedPageIndex().markInterested();
        page.pageCount().markInterested();
        page.selectedPageIndex().set(index);
        page.selectedPageIndex().addValueObserver(v -> this.repin());
        page.pageCount().addValueObserver(v -> this.repin());
    }

    public RemoteControl parameter(int param) {
        return this.page.getParameter(param);
    }

    /**
     * Whether the device/track actually has a page at this index. A cursor set
     * to an out-of-range index is silently clamped to page 0, so its parameters
     * report {@code exists() == true} even though they belong to another page —
     * only {@code pageCount()} tells the truth about whether this page is real.
     */
    public boolean isPresent() {
        return this.page.pageCount().get() > this.index;
    }

    public void addPresenceObserver(Runnable onChange) {
        this.page.pageCount().addValueObserver(v -> onChange.run());
    }

    public void repin() {
        if (this.isPinned() || !this.isPresent()) return;
        this.host.scheduleTask(() -> {
            if (!this.isPinned() && this.isPresent())
                this.page.selectedPageIndex().set(this.index);
        }, REPIN_DELAY_MS);
    }

    private boolean isPinned() {
        return this.page.selectedPageIndex().get() == this.index;
    }
}
