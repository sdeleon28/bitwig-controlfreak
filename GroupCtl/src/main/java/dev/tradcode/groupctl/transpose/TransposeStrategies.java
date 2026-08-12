package dev.tradcode.groupctl.transpose;

import java.util.List;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.transpose.strategies.BitwigNoteTransposeStrategy;
import dev.tradcode.groupctl.transpose.strategies.GojiraStrategy;
import dev.tradcode.groupctl.transpose.strategies.HyperTuneStrategy;

/**
 * Every device global transpose knows how to drive. Each is offered every marked
 * device and ignores the ones that are not its kind, so their name tests have to
 * stay mutually exclusive — two strategies claiming one device would both write
 * to it.
 *
 * A marked device none of them claims is left alone. Falling back to a generic
 * writer would be worse than doing nothing: the wrong range is silent, and a
 * guitar quietly detuned by the wrong amount is only discovered while playing.
 */
public final class TransposeStrategies {
    private TransposeStrategies() { }

    public static List<TransposeStrategy> all(IEventBus bus) {
        return List.of(
            new GojiraStrategy(bus),
            new HyperTuneStrategy(bus),
            new BitwigNoteTransposeStrategy(bus)
        );
    }
}
