package dev.tradcode.groupctl.mixmachine.events;

public class BitwigDevice {
    public Integer id; // index of the track in our internal cache
    public String name;
    public boolean exists;
    public boolean isNested;
    public boolean isSelected;
    public boolean isExpanded;
    public boolean isRcSectionVisible;
    public boolean isWindowOpen;
    public boolean isPlugin;

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof BitwigDevice))
            return false;
        var o = (BitwigDevice) other;
        return (
               this.id == o.id
            && this.name == o.name
            && this.exists == o.exists
            && this.isNested == o.isNested
            && this.isSelected == o.isSelected
            && this.isExpanded == o.isExpanded
            && this.isRcSectionVisible == o.isRcSectionVisible
            && this.isWindowOpen == o.isWindowOpen
            && this.isPlugin == o.isPlugin
        );
    }

    // big assumptions here
    public int getPosition() {
        return this.id + 1;
    }
}
