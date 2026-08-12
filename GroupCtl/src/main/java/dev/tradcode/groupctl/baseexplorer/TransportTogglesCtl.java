package dev.tradcode.groupctl.explorer;

import dev.tradcode.groupctl.explorer.events.RequestSetLoop;
import dev.tradcode.groupctl.explorer.events.RequestSetMetronome;
import dev.tradcode.groupctl.explorer.events.RequestSetRecord;
import dev.tradcode.groupctl.explorer.events.TransportTogglesUpdate;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

public class TransportTogglesCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = false;
    boolean loopEnabled = false;
    boolean metronomeEnabled = false;
    boolean recordEnabled = false;

    public TransportTogglesCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.pageActive) return;
        this.bus.send(
            new PaintSideButton(
                SideButton.MUTE,
                this.loopEnabled ? ExplorerColors.LOOP_COLOR : 0
            ),
            new PaintSideButton(
                SideButton.SOLO,
                this.metronomeEnabled ? ExplorerColors.METRONOME_COLOR : 0
            ),
            new PaintSideButton(
                SideButton.RECORD_ARM,
                this.recordEnabled ? ExplorerColors.RECORD_COLOR : 0
            )
        );
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.pageActive = n == 1;
                this.paint();
            }
            case TransportTogglesUpdate(boolean loop, boolean metronome, boolean record) -> {
                this.loopEnabled = loop;
                this.metronomeEnabled = metronome;
                this.recordEnabled = record;
                this.paint();
            }
            case SideButtonClick(var btn) when this.pageActive && btn == SideButton.MUTE ->
                this.bus.send(new RequestSetLoop(!this.loopEnabled));
            case SideButtonClick(var btn) when this.pageActive && btn == SideButton.SOLO ->
                this.bus.send(new RequestSetMetronome(!this.metronomeEnabled));
            case SideButtonClick(var btn) when this.pageActive && btn == SideButton.RECORD_ARM ->
                this.bus.send(new RequestSetRecord(!this.recordEnabled));
            default -> { }
        }
    }
}
