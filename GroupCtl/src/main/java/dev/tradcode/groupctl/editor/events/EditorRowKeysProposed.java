package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

/**
 * A mapper offering the keys it would place on the eight grid rows (top row
 * first) for the current view, tagged with its priority. {@code applicable} is
 * false when the mapper does not apply to the current clip and is only
 * withdrawing itself. The {@link dev.tradcode.groupctl.editor.EditorMappingSelector}
 * picks the highest-priority applicable proposal; mappers never see each other.
 */
public record EditorRowKeysProposed(int priority, boolean applicable, int[] rowKeys)
    implements Event { }
