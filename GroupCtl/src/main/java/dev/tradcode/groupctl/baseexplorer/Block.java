package dev.tradcode.groupctl.explorer;

public final class Block {
    public final int color;       // launchpad color of the underlying section
    public final double startBeat;
    public final double endBeat;
    public final boolean selected;
    public final boolean playing;
    public final boolean empty;

    public Block(int color, double startBeat, double endBeat,
                 boolean selected, boolean playing, boolean empty) {
        this.color = color;
        this.startBeat = startBeat;
        this.endBeat = endBeat;
        this.selected = selected;
        this.playing = playing;
        this.empty = empty;
    }

    public static Block bar(int color, double startBeat, double endBeat) {
        return new Block(color, startBeat, endBeat, false, false, false);
    }

    public static Block emptySlot() {
        return new Block(0, 0, 0, false, false, true);
    }

    public Block withSelected(boolean s) {
        return new Block(color, startBeat, endBeat, s, playing, empty);
    }

    public Block withPlaying(boolean p) {
        return new Block(color, startBeat, endBeat, selected, p, empty);
    }
}
