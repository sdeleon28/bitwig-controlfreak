package dev.tradcode.groupctl.events;

public class BitwigSend {
    public int trackId;
    public int id;
    public boolean exists;
    public String name;
    public double value;

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof BitwigSend))
            return false;
        var o = (BitwigSend) other;
        return (
               this.trackId == o.trackId
            && this.id == o.id
            && this.exists == o.exists
            && this.name == o.name
            // purposefully exclude value here
        );
    }
}
