package dev.tradcode.groupctl.editor.ggd;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class GgdDrumMapTest {

    @Test
    void matchesGgdAnywhereInTheNameCaseInsensitively() {
        assertTrue(GgdDrumMap.matches("ggd"));
        assertTrue(GgdDrumMap.matches("Drums GGD"));
        assertTrue(GgdDrumMap.matches("my gGd kit"));
    }

    @Test
    void doesNotMatchOtherNames() {
        assertFalse(GgdDrumMap.matches("Drums"));
        assertFalse(GgdDrumMap.matches(""));
        assertFalse(GgdDrumMap.matches(null));
    }
}
