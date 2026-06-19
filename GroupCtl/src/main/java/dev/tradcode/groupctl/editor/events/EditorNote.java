package dev.tradcode.groupctl.editor.events;

public record EditorNote(int key, double beat, double velocity) {
    public EditorNote(int key, double beat) {
        this(key, beat, 1.0);
    }
}
