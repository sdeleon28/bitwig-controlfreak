package dev.tradcode.groupctl;

import java.util.EnumSet;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.TwisterSideButton;
import dev.tradcode.groupctl.events.TwisterSideButtonChord;
import dev.tradcode.groupctl.events.TwisterSideButtonClick;
import dev.tradcode.groupctl.events.TwisterSideButtonPressed;
import dev.tradcode.groupctl.events.TwisterSideButtonReleased;

/**
 * Chords fire on the press that completes them, while clicks wait for the
 * release, so a button that took part in a chord never also clicks.
 */
public class TwisterSideButtonGestures implements IEventBusSubscriber {
    IEventBus bus;
    EnumSet<TwisterSideButton> held = EnumSet.noneOf(TwisterSideButton.class);
    EnumSet<TwisterSideButton> chorded = EnumSet.noneOf(TwisterSideButton.class);

    public TwisterSideButtonGestures(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    @Override
    public void on(Event event) {
        switch (event) {
            case TwisterSideButtonPressed(var button) -> {
                for (var other : this.held)
                    this.bus.send(new TwisterSideButtonChord(other, button));
                if (!this.held.isEmpty()) {
                    this.chorded.addAll(this.held);
                    this.chorded.add(button);
                }
                this.held.add(button);
            }
            case TwisterSideButtonReleased(var button) -> {
                this.held.remove(button);
                if (!this.chorded.remove(button))
                    this.bus.send(new TwisterSideButtonClick(button));
            }
            default -> { }
        }
    }
}
