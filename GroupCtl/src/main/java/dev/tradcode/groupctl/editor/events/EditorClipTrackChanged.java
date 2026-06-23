package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

/**
 * The name of the track holding the selected clip. The base editor stays
 * ignorant of what any name means; mappers decide for themselves whether they
 * apply to it.
 */
public record EditorClipTrackChanged(String trackName) implements Event { }
