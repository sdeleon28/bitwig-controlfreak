package dev.tradcode.groupctl.editor.events;

public record EditorNote(int key, double beat, double velocity, boolean selected) {
    public EditorNote(int key, double beat, double velocity) {
        this(key, beat, velocity, false);
    }

    public EditorNote(int key, double beat) {
        this(key, beat, 1.0, false);
    }
}
