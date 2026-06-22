package dev.tradcode.groupctl.editor.events;

public record EditorSlot(boolean lit, int key, double startBeat, double endBeat,
                         double velocity, boolean playing) {
    public EditorSlot(boolean lit, int key, double startBeat, double endBeat, double velocity) {
        this(lit, key, startBeat, endBeat, velocity, false);
    }

    public EditorSlot(boolean lit, int key, double startBeat, double endBeat) {
        this(lit, key, startBeat, endBeat, lit ? 1.0 : 0.0, false);
    }
}
