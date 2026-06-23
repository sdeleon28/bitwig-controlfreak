package dev.tradcode.groupctl.editor;

import dev.tradcode.groupctl.editor.events.EditorRowKeysChanged;
import dev.tradcode.groupctl.editor.events.EditorRowKeysProposed;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class EditorMappingSelectorTest {

    private static final int[] LOW = { 1, 2, 3 };
    private static final int[] HIGH = { 7, 8, 9 };
    private static final int[] NONE = new int[0];

    @Test
    void publishesTheOnlyProposal() {
        FakeEventBus bus = new FakeEventBus();
        new EditorMappingSelector(bus);

        bus.send(new EditorRowKeysProposed(0, true, LOW));

        assertArrayEquals(LOW, bus.last(EditorRowKeysChanged.class).rowKeys());
    }

    @Test
    void theHighestPriorityApplicableProposalWinsRegardlessOfOrder() {
        FakeEventBus a = new FakeEventBus();
        new EditorMappingSelector(a);
        a.send(new EditorRowKeysProposed(0, true, LOW));
        a.send(new EditorRowKeysProposed(100, true, HIGH));
        assertArrayEquals(HIGH, a.last(EditorRowKeysChanged.class).rowKeys());

        FakeEventBus b = new FakeEventBus();
        new EditorMappingSelector(b);
        b.send(new EditorRowKeysProposed(100, true, HIGH));
        b.send(new EditorRowKeysProposed(0, true, LOW));
        assertArrayEquals(HIGH, b.last(EditorRowKeysChanged.class).rowKeys());
    }

    @Test
    void fallsBackToTheLowerProposalWhenTheWinnerWithdraws() {
        FakeEventBus bus = new FakeEventBus();
        new EditorMappingSelector(bus);

        bus.send(new EditorRowKeysProposed(0, true, LOW));
        bus.send(new EditorRowKeysProposed(100, true, HIGH));
        bus.send(new EditorRowKeysProposed(100, false, NONE));

        assertArrayEquals(LOW, bus.last(EditorRowKeysChanged.class).rowKeys());
    }

    @Test
    void ignoresALowerProposalWhileAHigherOneLeads() {
        FakeEventBus bus = new FakeEventBus();
        new EditorMappingSelector(bus);

        bus.send(new EditorRowKeysProposed(100, true, HIGH));
        long before = bus.count(EditorRowKeysChanged.class);

        bus.send(new EditorRowKeysProposed(0, true, LOW));
        assertEquals(before, bus.count(EditorRowKeysChanged.class));
    }

    @Test
    void doesNotRepublishAnUnchangedWinner() {
        FakeEventBus bus = new FakeEventBus();
        new EditorMappingSelector(bus);

        bus.send(new EditorRowKeysProposed(0, true, LOW));
        long before = bus.count(EditorRowKeysChanged.class);

        bus.send(new EditorRowKeysProposed(0, true, LOW.clone()));
        assertEquals(before, bus.count(EditorRowKeysChanged.class));
    }
}
