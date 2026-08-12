package dev.tradcode.groupctl.transpose;

import java.util.regex.Pattern;

/**
 * The {@value #MARKER} suffix convention that opts a device into global
 * transpose, in the spirit of the {@code (N)} / {@code [N]} track names
 * elsewhere in the project: rename the device in Bitwig and it joins, rename it
 * back and it leaves. That keeps the feature free of plugin UUIDs and VST3 class
 * ids, which are neither readable through the API nor reliably extractable from
 * a PACE-wrapped bundle.
 *
 * The marker can carry a signed baseline — {@code {T+2}}, {@code {T-3}} — which
 * is where the device already sits when global transpose reads zero. A keyboard
 * pitched up two semitones so a Db-major shape sounds in C minor is marked
 * {@code {T+2}}, and global -1 puts it at +1. The baseline rides on the instance
 * rather than living in a table because the same device sits at a different
 * offset on every track it appears on.
 */
public final class TransposeMarker {
    private TransposeMarker() { }

    public static final String MARKER = "{T}";

    static final Pattern SUFFIX = Pattern.compile("\\{T([+-]\\d+)?\\}$");

    public static boolean isMarked(String deviceName) {
        return deviceName != null && SUFFIX.matcher(deviceName.trim()).find();
    }

    public static int baselineOf(String deviceName) {
        if (deviceName == null)
            return 0;
        var match = SUFFIX.matcher(deviceName.trim());
        if (!match.find() || match.group(1) == null)
            return 0;
        return Integer.parseInt(match.group(1));
    }
}
