package dev.tradcode.groupctl.mixmachine.frequalizer;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.EncoderSlot;
import dev.tradcode.groupctl.mixmachine.frequalizer.events.FrequalizerEncodersChanged;

/**
 * Paints the 16 Twister encoders from the calculator's encoder frames. Pure
 * data → hardware: it calculates nothing. The cleared frame the calculator
 * emits on deactivation blanks all 16.
 */
public class FrequalizerTwisterPainter implements IEventBusSubscriber {
    IEventBus bus;

    public FrequalizerTwisterPainter(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    public void on(Event event) {
        switch (event) {
            case FrequalizerEncodersChanged(var slots) -> {
                int n = Math.min(slots.size(), FrequalizerCalculator.ENCODER_COUNT);
                for (int i = 0; i < n; i++) {
                    EncoderSlot slot = slots.get(i);
                    this.bus.send(
                        new PaintEncoder(i + 1, slot.color()),
                        new SetEncoderValue(i + 1, slot.ring())
                    );
                }
            }
            default -> { }
        }
    }
}
