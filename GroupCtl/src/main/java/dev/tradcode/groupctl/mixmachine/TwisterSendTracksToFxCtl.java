package dev.tradcode.groupctl.mixmachine;

import dev.tradcode.groupctl.mixmachine.events.BitwigSend;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrack;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestFxSetSolo;
import dev.tradcode.groupctl.mixmachine.events.SendValueUpdated;
import dev.tradcode.groupctl.mixmachine.events.SendsChanged;
import dev.tradcode.groupctl.mixmachine.events.SetSelectedTrackSend;
import java.util.ArrayList;
import java.util.List;

import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderButtonReleased;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.SendEncoderPressed;
import dev.tradcode.groupctl.events.SetEncoderValue;

/**
 * Twister program: one encoder per child track of the active group, each
 * showing and editing that child track's send level to the single selected FX
 * track.
 */
public class TwisterSendTracksToFxCtl extends TwisterTrackCtl {
    int selectedFx = -1;
    String selectedFxName = "";
    List<BitwigSend> sends = new ArrayList<>();

    public TwisterSendTracksToFxCtl(IEventBus bus) {
        super(bus);
    }

    private void setSolo(boolean solo) {
        if (!active || this.selectedFx == -1) return;
        this.bus.send(new RequestFxSetSolo(this.selectedFx, this.selectedFxName, solo));
    }

    private void announcePress(int n) {
        if (!active || this.selectedFx == -1) return;
        this.tracksInSelectedGroup()
            .stream()
            .filter(t -> t.getPosition() == n)
            .findFirst()
            .ifPresent(t -> this.bus.send(
                new SendEncoderPressed(t.name, this.selectedFxName)
            ));
    }

    @Override
    protected void paintRing(BitwigTrack t) {
        if (!active) return;
        if (this.selectedFx == -1) return;
        this.sends.stream()
            .filter(s -> s.trackId == t.id && s.id == this.selectedFx)
            .findFirst()
            .ifPresent(s -> this.bus.send(
                new SetEncoderValue(
                    t.getPosition(),
                    (int) Math.round(s.value * 127)
                )
            ));
    }

    @Override
    public void on(Event event) {
        super.on(event);
        switch (event) {
            case BitwigTrackSelected(int n) -> {
                this.active = false;
                this.selectedFx = -1;
            }
            case RequestSelectTrack(int trackId, String name) -> {
                if (trackId != this.selectedGroupId) return;
                this.active = false;
                this.selectedFx = -1;
            }
            case RequestFxSelectTrack(int id, String name) -> {
                // Group context only: the active selection is the group itself.
                // When a child track is selected (selectedTrackId differs from
                // the group), TwisterSendTrackToAllFxCtl owns the encoders.
                if (this.selectedTrackId != this.selectedGroupId) {
                    this.active = false;
                    return;
                }
                this.active = true;
                this.selectedFx = id;
                this.selectedFxName = name;
                this.refresh();
            }
            case EncoderButtonPressed(int n) -> {
                this.setSolo(true);
                this.announcePress(n);
            }
            case EncoderButtonReleased(int n) -> this.setSolo(false);
            case EncoderTurned(int n, int v) -> {
                if (!active) return;
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.getPosition() == n)
                    .findFirst()
                    .ifPresent(t -> this.bus.send(
                        new SetSelectedTrackSend(
                            t.id,
                            this.selectedFx,
                            ((double) v) / 127.0
                        )
                    ));
            }
            case SendsChanged(List<BitwigSend> sends) -> {
                this.sends = sends;
                this.paintRings();
            }
            case SendValueUpdated(int trackId, int sendId, double v) -> {
                this.sends.stream()
                    .filter(s -> s.trackId == trackId && s.id == sendId)
                    .findFirst()
                    .ifPresent(s -> s.value = v);
                if (sendId != this.selectedFx) return;
                this.tracksInSelectedGroup()
                    .stream()
                    .filter(t -> t.id == trackId)
                    .findFirst()
                    .ifPresent(this::paintRing);
            }
            default -> { }
        }
    }
}
