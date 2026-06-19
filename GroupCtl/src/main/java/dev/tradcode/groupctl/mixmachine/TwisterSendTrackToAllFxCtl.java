package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigSend;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.FxPanUpdated;
import dev.tradcode.groupctl.mixmachine.events.FxSchemaChanged;
import dev.tradcode.groupctl.mixmachine.events.FxVolumeUpdated;
import dev.tradcode.groupctl.mixmachine.events.RequestFxSetSolo;
import dev.tradcode.groupctl.mixmachine.events.SendValueUpdated;
import dev.tradcode.groupctl.mixmachine.events.SendsChanged;
import dev.tradcode.groupctl.mixmachine.events.SetFxTrackPan;
import dev.tradcode.groupctl.mixmachine.events.SetFxTrackVolume;
import dev.tradcode.groupctl.mixmachine.events.SetSelectedTrackSend;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.FxEncoderPressed;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SendEncoderPressed;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.events.VolModeSelected;

/**
 * Twister program for the "selected track, then FX" gesture (in contrast to
 * "selected group, then FX", which activates {@link TwisterSendTracksToFxCtl}).
 *
 * <p>The encoders split into two blocks, each covering all 8 FX tracks laid out
 * like {@code LaunchpadFxCtl} (FX0 bottom-left, left-to-right, bottom-to-top):
 * <ul>
 *   <li>bottom 8 encoders (positions 1..8): the selected track's send level to
 *       each FX track;</li>
 *   <li>top 8 encoders (positions 9..16): each FX track's own vol/pan,
 *       following the shared vol/pan mode selector.</li>
 * </ul>
 */
public class TwisterSendTrackToAllFxCtl extends TwisterTrackEncoderCtl {
    static int FX_COUNT = 8;
    int SOLO_COLOR = 66; // twister yellow, mirrors TwisterTrackCtl

    VolPanMode volPanMode = VolPanMode.VOL;
    List<BitwigTrack> fxTracks = new ArrayList<>();
    List<BitwigSend> sends = new ArrayList<>();

    public TwisterSendTrackToAllFxCtl(IEventBus bus) {
        super(bus);
    }

    private int sendPos(int fxIndex) {
        return fxIndex + 1;
    }

    private int volPanPos(int fxIndex) {
        return fxIndex + 9;
    }

    private int fxIndexForButton(int n) {
        if (n >= 1 && n <= FX_COUNT) return n - 1;
        if (n >= 9 && n <= 8 + FX_COUNT) return n - 9;
        return -1;
    }

    private void setSoloAt(int n, boolean solo) {
        if (!isActive()) return;
        int fxIndex = this.fxIndexForButton(n);
        if (fxIndex < 0) return;
        this.fxTracks.stream()
            .filter(fx -> fx.id == fxIndex)
            .findFirst()
            .ifPresent(fx -> this.bus.send(new RequestFxSetSolo(fx.id, fx.name, solo)));
    }

    private void announcePress(int n) {
        if (!isActive()) return;
        if (n >= 1 && n <= FX_COUNT) {
            // bottom block: selected track's send to this FX
            int fxIndex = n - 1;
            var trackName = this.trackNameById(this.selectedTrackId);
            if (trackName == null) return;
            this.fxTracks.stream()
                .filter(fx -> fx.id == fxIndex)
                .findFirst()
                .ifPresent(fx -> this.bus.send(
                    new SendEncoderPressed(trackName, fx.name)
                ));
        } else if (n >= 9 && n <= 8 + FX_COUNT) {
            // top block: the FX track itself
            int fxIndex = n - 9;
            this.fxTracks.stream()
                .filter(fx -> fx.id == fxIndex)
                .findFirst()
                .ifPresent(fx -> this.bus.send(new FxEncoderPressed(fx.name)));
        }
    }

    @Override
    protected void paint() {
        if (!isActive()) return;
        this.clearLeds();
        for (var fx : this.fxTracks) {
            if (fx.id < 0 || fx.id >= FX_COUNT) continue;
            var color = fx.solo ? SOLO_COLOR : this.bwToTwisterColor(fx.color);
            this.bus.send(new PaintEncoder(this.sendPos(fx.id), color));
            this.bus.send(new PaintEncoder(this.volPanPos(fx.id), color));
        }
    }

    @Override
    protected void paintRings() {
        if (!isActive()) return;
        this.clearRings();
        for (var fx : this.fxTracks) {
            if (fx.id < 0 || fx.id >= FX_COUNT) continue;
            this.paintFxVolPanRing(fx.id);
            this.paintSendRing(fx.id);
        }
    }

    /** Top block: FX track's own vol or pan. */
    private void paintFxVolPanRing(int fxIndex) {
        if (!isActive()) return;
        this.fxTracks.stream()
            .filter(fx -> fx.id == fxIndex)
            .findFirst()
            .ifPresent(fx -> this.bus.send(
                new SetEncoderValue(
                    this.volPanPos(fxIndex),
                    (int) Math.round(
                        ((this.volPanMode == VolPanMode.VOL) ? fx.volume : fx.pan)
                            * 127
                    )
                )
            ));
    }

    /** Bottom block: selected track's send level to FX {@code fxIndex}. */
    private void paintSendRing(int fxIndex) {
        if (!isActive()) return;
        this.sends.stream()
            .filter(s -> s.trackId == this.selectedTrackId && s.id == fxIndex)
            .findFirst()
            .ifPresent(s -> this.bus.send(
                new SetEncoderValue(
                    this.sendPos(fxIndex),
                    (int) Math.round(s.value * 127)
                )
            ));
    }

    @Override
    public void on(Event event) {
        super.on(event);
        switch (event) {
            case RequestFxSelectTrack(int id, String name) -> {
                // Track context only: a child track is selected (its id differs
                // from the group's). In group context TwisterSendTracksToFxCtl
                // owns the encoders instead.
                if (this.selectedTrackId == this.selectedGroupId) {
                    this.active = false;
                    return;
                }
                this.active = true;
                this.refresh();
            }
            case BitwigTrackSelected(int n) -> this.active = false;
            case RequestSelectTrack(int trackId, String name) -> this.active = false;
            case FxSchemaChanged(ArrayList<BitwigTrack> fx) -> {
                this.fxTracks = fx;
                this.refresh();
            }
            case FxVolumeUpdated(int id, double v) -> {
                this.fxTracks.stream()
                    .filter(fx -> fx.id == id)
                    .findFirst()
                    .ifPresent(fx -> fx.volume = v);
                if (this.volPanMode == VolPanMode.VOL)
                    this.paintFxVolPanRing(id);
            }
            case FxPanUpdated(int id, double v) -> {
                this.fxTracks.stream()
                    .filter(fx -> fx.id == id)
                    .findFirst()
                    .ifPresent(fx -> fx.pan = v);
                if (this.volPanMode == VolPanMode.PAN)
                    this.paintFxVolPanRing(id);
            }
            case SendsChanged(List<BitwigSend> s) -> {
                this.sends = s;
                this.paintRings();
            }
            case SendValueUpdated(int trackId, int sendId, double v) -> {
                this.sends.stream()
                    .filter(s -> s.trackId == trackId && s.id == sendId)
                    .findFirst()
                    .ifPresent(s -> s.value = v);
                if (trackId != this.selectedTrackId) return;
                this.paintSendRing(sendId);
            }
            case EncoderTurned(int n, int v) -> {
                if (!isActive()) return;
                double val = ((double) v) / 127.0;
                if (n >= 1 && n <= FX_COUNT) {
                    this.bus.send(
                        new SetSelectedTrackSend(this.selectedTrackId, n - 1, val)
                    );
                } else if (n >= 9 && n <= 8 + FX_COUNT) {
                    int fxIndex = n - 9;
                    this.bus.send(
                        (this.volPanMode == VolPanMode.VOL)
                            ? new SetFxTrackVolume(fxIndex, val)
                            : new SetFxTrackPan(fxIndex, val)
                    );
                }
            }
            case EncoderButtonPressed(int n) -> {
                this.setSoloAt(n, true);
                this.announcePress(n);
            }
            case EncoderButtonReleased(int n) -> this.setSoloAt(n, false);
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
