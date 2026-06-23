package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorRowKeysChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysProposed;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;

/**
 * Arbitrates between mappers without knowing any of them. Each mapper proposes
 * the keys it would paint, tagged with a priority; the selector republishes the
 * highest-priority applicable proposal as the one authoritative mapping. A
 * custom mapper outranks the default fallback by carrying a higher priority, so
 * the default wins exactly when no custom mapper applies — and dropping a
 * mapper's package simply removes its proposals from the contest.
 */
public class EditorMappingSelector implements IEventBusSubscriber {
    IEventBus bus;
    final Map<Integer, int[]> applicable = new HashMap<>();
    int[] published = null;

    public EditorMappingSelector(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void select() {
        int[] winner = null;
        int best = Integer.MIN_VALUE;
        for (var entry : this.applicable.entrySet())
            if (entry.getKey() >= best) {
                best = entry.getKey();
                winner = entry.getValue();
            }
        if (winner == null || Arrays.equals(winner, this.published))
            return;
        this.published = winner;
        this.bus.send(new EditorRowKeysChanged(winner));
    }

    public void on(Event event) {
        switch (event) {
            case EditorRowKeysProposed(int priority, boolean applies, int[] rowKeys) -> {
                if (applies)
                    this.applicable.put(priority, rowKeys);
                else
                    this.applicable.remove(priority);
                this.select();
            }
            default -> { }
        }
    }
}
