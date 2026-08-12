package dev.tradcode.groupctl.transpose;

import java.util.List;
import java.util.Map;

/**
 * Decides, from a device's instance name alone, whether global transpose drives
 * it and which param to reach for.
 *
 * Participation is opt-in through the {@value #MARKER} suffix convention, in the
 * spirit of the {@code (N)} / {@code [N]} track names elsewhere in the project:
 * rename the device in Bitwig and it joins, rename it back and it leaves. That
 * keeps the feature free of plugin UUIDs and VST3 class ids, which are neither
 * readable through the API nor reliably extractable from a PACE-wrapped bundle.
 *
 * {@link #OVERRIDES} exists only for devices the default alias list or the
 * default semitone span gets wrong. Match is on a substring of the device name,
 * so it survives the {@value #MARKER} suffix and any other renaming around it.
 *
 * Verified against the default (see SPEC.md for the procedure):
 *   Archetype Gojira X — "Transpose", 1/24 per step over 0..1, so -12..+12.
 *
 * The table is empty on purpose. A row is earned by a device that has been
 * observed to misbehave on the default, never by guesswork: an unverified row
 * looks exactly like a verified one and silently overrides the one arrangement
 * that is known to work.
 */
public final class TransposeMapping {
    private TransposeMapping() { }

    public static final String MARKER = "{T}";

    static final TransposeTarget DEFAULT = new TransposeTarget(
        List.of("Transpose", "Semitones", "Pitch", "Transposition", "Key"), -12, 12);

    // e.g. Map.entry("Some Plugin", new TransposeTarget(List.of("Pitch"), -24, 24))
    static final Map<String, TransposeTarget> OVERRIDES = Map.of();

    public static boolean isMarked(String deviceName) {
        return deviceName != null && deviceName.trim().endsWith(MARKER);
    }

    public static TransposeTarget targetFor(String deviceName) {
        return targetFor(deviceName, OVERRIDES);
    }

    static TransposeTarget targetFor(
        String deviceName, Map<String, TransposeTarget> overrides
    ) {
        if (deviceName != null)
            for (var override : overrides.entrySet())
                if (deviceName.contains(override.getKey()))
                    return override.getValue();
        return DEFAULT;
    }
}
