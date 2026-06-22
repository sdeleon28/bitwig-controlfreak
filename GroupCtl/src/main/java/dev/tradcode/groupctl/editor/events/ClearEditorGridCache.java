package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

/**
 * Tells {@link dev.tradcode.groupctl.editor.EditorGridPainter} to forget what it
 * believes is on the grid pads, so the next {@code EditorGridChanged} repaints
 * every cell. Emitted when the page picker overlay (which paints over the grid
 * outside the painter's knowledge) is dismissed; without it the painter dedups
 * the restore against a stale cache and leaves the overlay on screen. Resets the
 * cache only — it never blanks pads, mirroring how the painter treats
 * {@code ClearLaunchpad}.
 */
public record ClearEditorGridCache() implements Event { }
