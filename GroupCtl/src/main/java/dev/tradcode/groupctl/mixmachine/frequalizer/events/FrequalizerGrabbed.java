package dev.tradcode.groupctl.mixmachine.frequalizer.events;

import dev.tradcode.groupctl.events.Event;

/**
 * A Frequalizer was grabbed onto the surface. Unlike {@link FrequalizerActivated}
 * this fires on every grab, including a re-grab while the feature already runs,
 * because each one re-targets the feature onto a different plugin instance.
 */
public record FrequalizerGrabbed() implements Event { }
