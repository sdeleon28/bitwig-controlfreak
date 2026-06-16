package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;
import dev.tradcode.groupctl.events.VolModeSelected;

enum VolPanMode { VOL, PAN };

public class VolPanCtl implements IEventBusSubscriber {
    IEventBus bus;
    boolean pageActive = true;
    VolPanMode mode = VolPanMode.VOL;

    public VolPanCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.paint();
    }

    public void paint() {
        if (!this.pageActive)
            return;
        this.bus.send(
            new PaintSideButton(
                SideButton.VOLUME,
                this.mode == VolPanMode.VOL ? MixMachineColors.VOL_COLOR : 0
            ),
            new PaintSideButton(
                SideButton.PAN,
                this.mode == VolPanMode.PAN ? MixMachineColors.PAN_COLOR : 0
            )
        );
    }

    public void on(Event event) {
        switch (event) {
            case SideButtonClick(var btn) when btn == SideButton.VOLUME -> {
                this.mode = VolPanMode.VOL;
                this.bus.send(new VolModeSelected());
                this.paint();
            }
            case SideButtonClick(var btn) when btn == SideButton.PAN -> {
                this.mode = VolPanMode.PAN;
                this.bus.send(new PanModeSelected());
                this.paint();
            }
            case PageSelected(int n) -> {
                this.pageActive = n == 0;
                this.paint();
            }
            default -> { }
        }
    }
}
