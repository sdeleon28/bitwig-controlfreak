package dev.tradcode.groupctl.events;

public enum SideButton {
    VOLUME(89),
    PAN(79),
    SEND_A(69),
    SEND_B(59),
    STOP(49),
    MUTE(39),
    SOLO(29),
    RECORD_ARM(19);

    private final int value;

    SideButton(int value) {
        this.value = value;
    }

    public int getValue() {
        return this.value;
    }
}
