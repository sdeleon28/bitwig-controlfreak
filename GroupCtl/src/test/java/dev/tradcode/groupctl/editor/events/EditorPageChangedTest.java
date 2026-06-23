package dev.tradcode.groupctl.editor.events;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class EditorPageChangedTest {

    @Test
    void growlTextIsOneBasedOverTotal() {
        assertEquals("Page 1/4", new EditorPageChanged(0, 4).toString());
        assertEquals("Page 3/4", new EditorPageChanged(2, 4).toString());
    }
}
