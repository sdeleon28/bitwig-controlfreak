package dev.tradcode.groupctl;

public enum Page {
    GROUPCTL(0),
    PROJECT_EXPLORER(1),
    EDITOR(2),
    EDITOR_BOTTOM(3);

    // remember to update this!
    public static int getPageCount() {
        return 4;
    }

    public static boolean isEditorPage(int n) {
        return n == EDITOR.value || n == EDITOR_BOTTOM.value;
    }

    private final int value;

    Page(int value) {
        this.value = value;
    }

    public int getValue() {
        return this.value;
    }
}
