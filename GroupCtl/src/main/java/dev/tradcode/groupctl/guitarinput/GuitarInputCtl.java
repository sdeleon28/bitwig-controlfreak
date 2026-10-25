package dev.tradcode.groupctl.guitarinput;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonClick;
import dev.tradcode.groupctl.guitarinput.events.RequestArmGuitars;

public class GuitarInputCtl implements IEventBusSubscriber {
    IEventBus bus;

    public GuitarInputCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    @Override
    public void on(Event event) {
        if (event instanceof TwisterSideButtonClick(var btn) && btn == TwisterSideButton.TOP_LEFT)
            this.bus.send(new RequestArmGuitars());
    }
}
