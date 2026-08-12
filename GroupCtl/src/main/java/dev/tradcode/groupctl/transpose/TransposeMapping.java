package dev.tradcode.groupctl.transpose;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

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
 * The marker can carry a signed baseline — {@code {T+2}}, {@code {T-3}} — which
 * is where the device already sits when global transpose reads zero. A keyboard
 * pitched up two semitones so a Db-major shape sounds in C minor is marked
 * {@code {T+2}}, and global +1 puts it at +3. The baseline belongs on the
 * instance rather than in a table because the same Note Transpose device sits at
 * a different offset on every track it appears on.
 *
 * {@link #OVERRIDES} exists only for devices the default alias list or the
 * default semitone span gets wrong. Match is on a substring of the device name,
 * so it survives the {@value #MARKER} suffix and any other renaming around it.
 *
 * Verified (see SPEC.md for the procedure):
 *   Archetype Gojira X   — "Transpose", -12..+12, runs on the default.
 *   Bitwig Transpose FX  — "Semi", -48..+48, needs the row below.
 *
 * A row is earned by a device observed to misbehave on the default, never by
 * guesswork: an unverified row looks exactly like a verified one and silently
 * overrides the one arrangement known to work.
 */
public final class TransposeMapping {
    private TransposeMapping() { }

    public static final String MARKER = "{T}";

    static final TransposeTarget DEFAULT = new TransposeTarget(
        List.of("Transpose", "Semitones", "Pitch", "Transposition", "Key"), -12, 12);

    static final Map<String, TransposeTarget> OVERRIDES = Map.ofEntries(
        // Bitwig's Transpose note FX spans a full eight octaves, so the default
        // would compress an octave of travel into a quarter of the encoder.
        Map.entry("Transpose", new TransposeTarget(
            List.of("Semi", "Semitones", "Transpose"), -48, 48))
    );

    static final Pattern SUFFIX = Pattern.compile("\\{T([+-]\\d+)?\\}$");

    public static boolean isMarked(String deviceName) {
        return deviceName != null && SUFFIX.matcher(deviceName.trim()).find();
    }

    /** Where the device sits when global transpose is zero. */
    public static int baselineOf(String deviceName) {
        if (deviceName == null)
            return 0;
        var match = SUFFIX.matcher(deviceName.trim());
        if (!match.find() || match.group(1) == null)
            return 0;
        return Integer.parseInt(match.group(1));
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
