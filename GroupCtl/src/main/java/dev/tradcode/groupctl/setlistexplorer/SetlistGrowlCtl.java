package dev.tradcode.groupctl.setlistexplorer;

import dev.tradcode.groupctl.baseexplorer.events.ExplorerModeChanged;
import dev.tradcode.groupctl.setlistexplorer.events.SetlistChanged;
import dev.tradcode.groupctl.setlistexplorer.events.ShowSetlist;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

/**
 * The SEND_A "show setlist" button: lit while engaged with a non-empty setlist,
 * and on press asks for the whole song list to be growled. SEND_A is the setlist
 * view's alone on this page, so it is safe to blank when not engaged.
 */
public class SetlistGrowlCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean setlist = false;
    List<String> names = new ArrayList<>();

    public SetlistGrowlCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        int color = (this.pageActive && this.setlist && !this.names.isEmpty())
            ? SetlistColors.SETLIST : 0;
        this.bus.send(new PaintSideButton(SideButton.SEND_A, color));
    }

    public void on(Event event) {
        switch (event) {
            case SetlistChanged(var songNames) -> {
                this.names = songNames;
                this.paint();
            }
            case ExplorerModeChanged(boolean s) -> {
                this.setlist = s;
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                this.paint();
            }
            case SideButtonClick(var btn)
            when this.pageActive && this.setlist
              && !this.names.isEmpty() && btn == SideButton.SEND_A ->
                this.bus.send(new ShowSetlist(String.join("  ·  ", this.names)));
            default -> { }
        }
    }
}
