package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.PanUpdated;
import dev.tradcode.groupctl.mixmachine.events.RequestSetSolo;
import dev.tradcode.groupctl.mixmachine.events.SetTrackPan;
import dev.tradcode.groupctl.mixmachine.events.SetTrackVolume;
import dev.tradcode.groupctl.mixmachine.events.VolumeUpdated;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.TrackEncoderPressed;
import dev.tradcode.groupctl.events.VolModeSelected;

/**
 * Twister program: the 16 encoders show and edit the vol/pan of the tracks in
 * the selected group.
 */
public class TwisterVolPanCtl extends TwisterTrackCtl {
    int GROUP_POSITION = 16;
    VolPanMode volPanMode = VolPanMode.VOL;

    public TwisterVolPanCtl(IEventBus bus) {
        super(bus);
        this.active = true;
    }

    @Override
    protected void paintRing(BitwigTrack t) {
        if (!isActive()) return;
        this.bus.send(
            new SetEncoderValue(
                t.getPosition(),
                (int) Math.round(
                    ((this.volPanMode == VolPanMode.VOL)
                        ? t.volume
                        : t.pan
                    ) * 127
                )
            )
        );
    }

    @Override
    protected void paint() {
        super.paint();
        this.paintGroupLed();
    }

    @Override
    protected void paintRings() {
        super.paintRings();
        this.paintGroupRing();
    }

    private void paintGroupLed() {
        if (!isActive()) return;
        var g = this.selectedGroup();
        if (g == null) return;
        var color = g.solo ? SOLO_COLOR : this.bwToTwisterColor(g.color);
        this.bus.send(new PaintEncoder(GROUP_POSITION, color));
    }

    private void paintGroupRing() {
        if (!isActive()) return;
        var g = this.selectedGroup();
        if (g == null) return;
        this.bus.send(
            new SetEncoderValue(
                GROUP_POSITION,
                (int) Math.round(
                    ((this.volPanMode == VolPanMode.VOL) ? g.volume : g.pan) * 127
                )
            )
        );
    }

    private void setGroupSolo(boolean solo) {
        if (!isActive()) return;
        var g = this.selectedGroup();
        if (g != null)
            this.bus.send(new RequestSetSolo(g.id, g.name, solo));
    }

    private void announceGroupPress() {
        if (!isActive()) return;
        var g = this.selectedGroup();
        if (g != null)
            this.bus.send(new TrackEncoderPressed(g.name));
    }

    private void setSoloAt(int n, boolean solo) {
        if (!isActive()) return;
        this.tracksInSelectedGroup()
            .stream()
            .filter(t -> t.getPosition() == n)
            .findFirst()
            .ifPresent(t -> this.bus.send(new RequestSetSolo(t.id, t.name, solo)));
    }

    private void announcePress(int n) {
        if (!isActive()) return;
        this.tracksInSelectedGroup()
            .stream()
            .filter(t -> t.getPosition() == n)
            .findFirst()
            .ifPresent(t -> this.bus.send(new TrackEncoderPressed(t.name)));
    }

    @Override
    public void on(Event event) {
        super.on(event);
        switch (event) {
            case BitwigTrackSelected(int n) -> {
                // The master sentinel arrives as an ordinary selection but is not
                // one of our groups, so super.on leaves selectedGroupId == -1.
                // Yield the encoders to the master RC program instead of staying
                // active and later blanking its paint.
                this.active = this.selectedGroupId != -1;
                if (this.active) this.refresh();
            }
            case RequestSelectTrack(int trackId, String name) -> {
                if (trackId != this.selectedGroupId) return;
                this.active = true;
                this.refresh();
            }
            case RequestFxSelectTrack(int id, String name) -> this.active = false;
            case VolumeUpdated(int id, double v) -> {
                if (this.volPanMode != VolPanMode.VOL) return;
                if (id == this.selectedGroupId) {
                    var g = this.selectedGroup();
                    if (g != null) {
                        g.volume = v;
                        this.paintGroupRing();
                    }
                    return;
                }
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.id == id)
                    .findFirst()
                    .ifPresent(t -> {
                        t.volume = v;
                        this.paintRing(t);
                    });
            }
            case PanUpdated(int id, double v) -> {
                if (this.volPanMode != VolPanMode.PAN) return;
                if (id == this.selectedGroupId) {
                    var g = this.selectedGroup();
                    if (g != null) {
                        g.pan = v;
                        this.paintGroupRing();
                    }
                    return;
                }
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.id == id)
                    .findFirst()
                    .ifPresent(t -> {
                        t.pan = v;
                        this.paintRing(t);
                    });
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
                if (n == GROUP_POSITION) {
                    var g = this.selectedGroup();
                    if (g != null)
                        this.bus.send(
                            (this.volPanMode == VolPanMode.VOL)
                                ? new SetTrackVolume(g.id, ((double) v) / 127.0)
                                : new SetTrackPan(g.id, ((double) v) / 127.0)
                        );
                    return;
                }
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.getPosition() == n)
                    .findFirst()
                    .ifPresent(t -> this.bus.send(
                        (this.volPanMode == VolPanMode.VOL)
                            ? new SetTrackVolume(t.id, ((double) v) / 127.0)
                            : new SetTrackPan(t.id, ((double) v) / 127.0)
                    ));
            }
            case EncoderButtonPressed(int n) -> {
                if (n == GROUP_POSITION) {
                    this.setGroupSolo(true);
                    this.announceGroupPress();
                } else {
                    this.setSoloAt(n, true);
                    this.announcePress(n);
                }
            }
            case EncoderButtonReleased(int n) -> {
                if (n == GROUP_POSITION) this.setGroupSolo(false);
                else this.setSoloAt(n, false);
            }
            case VolModeSelected() -> {
                this.volPanMode = VolPanMode.VOL;
                this.paintRings();
            }
            case PanModeSelected() -> {
                this.volPanMode = VolPanMode.PAN;
                this.paintRings();
            }
            default -> { }
        }
    }
}
