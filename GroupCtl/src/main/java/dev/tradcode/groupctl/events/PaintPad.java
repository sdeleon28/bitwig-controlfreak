package dev.tradcode.groupctl.events;

public class PaintPad extends Event {
    public int n;
    public int color;

    public PaintPad(int n, int color) {
        this.n = n;
        this.color = color;
    }
}
