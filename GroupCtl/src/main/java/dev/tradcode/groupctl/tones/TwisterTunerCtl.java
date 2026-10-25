package dev.tradcode.groupctl.tones;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonClick;
import dev.tradcode.groupctl.tones.events.RequestToggleTuner;

/** The Twister's top-right side button toggles the tuner window. */
public class TwisterTunerCtl implements IEventBusSubscriber {
    IEventBus bus;

    public TwisterTunerCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    @Override
    public void on(Event event) {
        if (event instanceof TwisterSideButtonClick(var btn) && btn == TwisterSideButton.TOP_RIGHT)
            this.bus.send(new RequestToggleTuner());
    }
}
