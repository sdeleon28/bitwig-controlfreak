package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.Marker;
import dev.tradcode.groupctl.explorer.events.MarkersChanged;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.ResolutionChanged;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

/**
 * Owns the explorer's bars-per-pad resolution, mirroring the javascript
 * defaults (halve/double between 1 and 32). SESSION zooms out (more bars per
 * pad), USER_1 zooms in (fewer). Only active on the explorer page.
 *
 * <p>Auto-fit: rather than always starting at 1 bar/pad, the resolution is
 * auto-picked to the finest value from {@code {1,2,4,8,16,32}} that fits the
 * whole project on one 64-pad page. Auto-fit runs when the page is (re-)entered
 * and when markers change while the page is open, but a manual zoom takes over
 * until the next time the page is entered.
 */
public class ResolutionCtl implements IEventBusSubscriber {
    static final int MIN = 1;
    static final int MAX = 32;
    static final int[] RESOLUTIONS = {1, 2, 4, 8, 16, 32};

    IEventBus bus;
    int barsPerPad = 1;
    boolean pageActive = false;
    boolean overridden = false;
    int contentBars = 0;

    public ResolutionCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void decrease() {
        if (this.barsPerPad >= MAX)
            return;
        this.barsPerPad *= 2;
        this.overridden = true;
        this.bus.send(new ResolutionChanged(this.barsPerPad));
        this.paint();
    }

    private void increase() {
        if (this.barsPerPad <= MIN)
            return;
        this.barsPerPad /= 2;
        this.overridden = true;
        this.bus.send(new ResolutionChanged(this.barsPerPad));
        this.paint();
    }

    /** Finest resolution whose page count fits in one launchpad page. */
    private static int fitResolution(int contentBars) {
        for (int bpp : RESOLUTIONS)
            if (Math.ceil(contentBars / (double) bpp) <= ExplorerConstants.PAGE_SIZE)
                return bpp;
        return MAX;
    }

    private void applyAutoFit() {
        int bpp = fitResolution(this.contentBars);
        if (bpp != this.barsPerPad) {
            this.barsPerPad = bpp;
            this.bus.send(new ResolutionChanged(this.barsPerPad));
        }
    }

    /**
     * Number of one-bar blocks the project spans — matches BarsCalculator's
     * block count (first marker to one bar past the last).
     */
    private static int contentBarsOf(List<Marker> markers) {
        if (markers == null || markers.isEmpty())
            return 0;
        double first = markers.get(0).position();
        double last = first;
        for (Marker m : markers) {
            first = Math.min(first, m.position());
            last = Math.max(last, m.position());
        }
        return (int) Math.ceil((last - first) / ExplorerConstants.BEATS_PER_BAR) + 1;
    }

    private void paint() {
        int sessionColor = this.pageActive && this.barsPerPad < MAX
            ? ExplorerColors.RESOLUTION_COLOR : 0;
        int user1Color = this.pageActive && this.barsPerPad > MIN
            ? ExplorerColors.RESOLUTION_COLOR : 0;
        this.bus.send(
            new PaintTopButton(TopButton.SESSION, sessionColor),
            new PaintTopButton(TopButton.USER_1, user1Color)
        );
    }

    public void on(Event event) {
        switch (event) {
            case TopButtonClick(var btn) when this.pageActive && btn == TopButton.SESSION ->
                this.decrease();
            case TopButtonClick(var btn) when this.pageActive && btn == TopButton.USER_1 ->
                this.increase();
            case MarkersChanged(var markers) -> {
                this.contentBars = contentBarsOf(markers);
                if (this.pageActive && !this.overridden) {
                    this.applyAutoFit();
                    this.paint();
                }
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                if (this.pageActive) {
                    // Fresh view each time the explorer opens.
                    this.overridden = false;
                    this.applyAutoFit();
                }
                this.paint();
            }
            default -> { }
        }
    }
}
