package dev.tradcode.groupctl.transpose;

import java.util.List;

/**
 * How to drive one device's transpose param: what the param is called (first
 * alias that resolves wins) and what semitone span its 0..1 range covers.
 */
public record TransposeTarget(List<String> aliases, int minSemitones, int maxSemitones) {
    public int span() {
        return this.maxSemitones - this.minSemitones;
    }

    public int offsetFor(int semitones) {
        return Math.max(this.minSemitones, Math.min(this.maxSemitones, semitones))
            - this.minSemitones;
    }
}
