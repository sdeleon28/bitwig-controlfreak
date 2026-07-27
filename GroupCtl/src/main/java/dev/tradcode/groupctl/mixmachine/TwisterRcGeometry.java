package dev.tradcode.groupctl.mixmachine;

import java.util.HashMap;
import java.util.Map;

/**
 * Single source of truth for how the twister's encoders host remote controls.
 *
 * The 16 encoders form two stacked 8-encoder blocks. The bottom block (twister
 * positions 1..8) hosts the first remote-controls page, the top block
 * (positions 9..16) the second. Within each block the upper row holds params
 * 0..3 and the lower row params 4..7, so a param reads left-to-right, top row
 * then bottom row.
 *
 * A "slot" is the flat 0..15 index the RC programs speak in: slots 0..7 are the
 * first page, slots 8..15 the second. {@link #pageForSlot}/{@link #paramForSlot}
 * split a slot back into the (page, param) pair a {@code RemoteControlsPage}
 * addresses.
 */
public final class TwisterRcGeometry {
    public static final int RC_PER_PAGE = 8;
    public static final int PAGE_COUNT = 2;
    public static final int SLOT_COUNT = RC_PER_PAGE * PAGE_COUNT;

    private static final Map<Integer, Integer> POSITION_IN_BLOCK_TO_PARAM = Map.ofEntries(
        Map.entry(1, 4), Map.entry(2, 5), Map.entry(3, 6), Map.entry(4, 7),
        Map.entry(5, 0), Map.entry(6, 1), Map.entry(7, 2), Map.entry(8, 3)
    );
    private static final Map<Integer, Integer> PARAM_TO_POSITION_IN_BLOCK = reverse(POSITION_IN_BLOCK_TO_PARAM);

    private TwisterRcGeometry() { }

    public static int slotForPosition(int position) {
        if (position < 1 || position > SLOT_COUNT) return -1;
        int page = (position - 1) / RC_PER_PAGE;
        int positionInBlock = ((position - 1) % RC_PER_PAGE) + 1;
        return page * RC_PER_PAGE + POSITION_IN_BLOCK_TO_PARAM.get(positionInBlock);
    }

    public static int positionForSlot(int slot) {
        if (slot < 0 || slot >= SLOT_COUNT) return -1;
        int page = slot / RC_PER_PAGE;
        int param = slot % RC_PER_PAGE;
        return page * RC_PER_PAGE + PARAM_TO_POSITION_IN_BLOCK.get(param);
    }

    public static int pageForSlot(int slot) {
        return slot / RC_PER_PAGE;
    }

    public static int paramForSlot(int slot) {
        return slot % RC_PER_PAGE;
    }

    public static int slotFor(int page, int param) {
        return page * RC_PER_PAGE + param;
    }

    private static Map<Integer, Integer> reverse(Map<Integer, Integer> m) {
        var out = new HashMap<Integer, Integer>();
        m.forEach((k, v) -> out.put(v, k));
        return Map.copyOf(out);
    }
}
