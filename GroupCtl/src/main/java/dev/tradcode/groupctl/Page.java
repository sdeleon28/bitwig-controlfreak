package dev.tradcode.groupctl;

public enum Page {
    GROUPCTL(0),
    PROJECT_EXPLORER(1),
    EDITOR(2);

    // remember to update this!
    public static int getPageCount() {
        return 3;
    }

    private final int value;

    Page(int value) {
        this.value = value;
    }

    public int getValue() {
        return this.value;
    }
}
