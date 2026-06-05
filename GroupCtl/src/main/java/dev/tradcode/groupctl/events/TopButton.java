package dev.tradcode.groupctl.events;

public enum TopButton {
    UP(104),
    DOWN(105),
    LEFT(106),
    RIGHT(107),
    SESSION(108),
    USER_1(109),
    USER_2(110),
    MIXER(111);

    private final int value;

    TopButton(int value) {
        this.value = value;
    }

    public int getValue() {
        return this.value;
    }
}
