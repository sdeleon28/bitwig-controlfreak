package dev.tradcode.groupctl.explorer;

import java.util.ArrayList;
import java.util.List;

/**
 * Pure slice of the full block list down to the 64-pad grid for a given page.
 */
public class PageFilter {

    public List<Block> apply(List<Block> blocks, int page) {
        List<Block> out = new ArrayList<>(ExplorerConstants.PAGE_SIZE);
        int offset = page * ExplorerConstants.PAGE_SIZE;
        for (int i = 0; i < ExplorerConstants.PAGE_SIZE; i++) {
            int idx = offset + i;
            out.add(idx < blocks.size() ? blocks.get(idx) : Block.emptySlot());
        }
        return out;
    }
}
