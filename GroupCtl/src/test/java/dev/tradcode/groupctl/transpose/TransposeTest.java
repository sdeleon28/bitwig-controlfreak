package dev.tradcode.groupctl.transpose;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.masterrc.BitwigMasterRcTracker;
import dev.tradcode.groupctl.mixmachine.masterrc.TwisterMasterRcCtl;
import dev.tradcode.groupctl.transpose.events.MarkedDevicesChanged;
import dev.tradcode.groupctl.transpose.events.RequestDeviceParamWrite;

/**
 * Global transpose end to end: a twister encoder turn on the master page becomes
 * a param write for every marked device, through its own strategy.
 *
 * Both ends are real — the encoder quantization and the strategies — and the
 * Bitwig side is simply absent, which is the point: everything between the two
 * is events.
 */
class TransposeTest {
    static final int TRANSPOSE_ENCODER = 6;
    static final int FAR_LEFT = 0;
    static final int NOON = 64;
    static final int FAR_RIGHT = 127;

    static class Rig {
        final FakeEventBus bus = new FakeEventBus();
        final List<MarkedDevice> devices = new ArrayList<>();

        Rig() {
            new TwisterMasterRcCtl(this.bus);
            new TransposeApplier(this.bus);
            this.bus.send(new BitwigTrackSelected(BitwigMasterRcTracker.MASTER_ID));
        }

        MarkedDevice device(String name) {
            var device = new MarkedDevice(0, this.devices.size(), name);
            this.devices.add(device);
            this.bus.send(new MarkedDevicesChanged(List.copyOf(this.devices)));
            return device;
        }

        void turn(int position) {
            this.bus.send(new EncoderTurned(TRANSPOSE_ENCODER, position));
        }

        /** The last write asked of {@code device}, as {@code param=value/outOf}. */
        String lastWrite(MarkedDevice device) {
            RequestDeviceParamWrite last = null;
            for (var event : this.bus.events)
                if (event instanceof RequestDeviceParamWrite w && w.device().equals(device))
                    last = w;
            return last == null ? null
                : last.aliases().get(0) + "=" + last.value() + "/" + last.outOf();
        }

        long writes(MarkedDevice device) {
            return this.bus.events.stream()
                .filter(e -> e instanceof RequestDeviceParamWrite w
                    && w.device().equals(device))
                .count();
        }
    }

    @Test
    void farLeftDropsEveryMarkedDeviceAnOctave() {
        var rig = new Rig();
        var gojira = rig.device("Archetype Gojira X {T}");
        var hyperTune = rig.device("HyperTune Metal {T}");
        var noteFx = rig.device("Note Transpose {T}");

        rig.turn(FAR_LEFT);

        assertEquals("Transpose=0/24", rig.lastWrite(gojira),
            "-12..+12, so an octave down is the floor");
        assertEquals("Transpose=24/36", rig.lastWrite(hyperTune),
            "-36..0, so an octave down is two thirds up");
        assertEquals("Semi=36/96", rig.lastWrite(noteFx),
            "-48..+48, so an octave down is an eighth below centre");
    }

    @Test
    void farRightIsConcertPitch() {
        var rig = new Rig();
        var gojira = rig.device("Archetype Gojira X {T}");
        var hyperTune = rig.device("HyperTune Metal {T}");
        var noteFx = rig.device("Note Transpose {T}");

        rig.turn(FAR_LEFT);
        rig.turn(FAR_RIGHT);

        assertEquals("Transpose=12/24", rig.lastWrite(gojira));
        assertEquals("Transpose=36/36", rig.lastWrite(hyperTune));
        assertEquals("Semi=48/96", rig.lastWrite(noteFx));
    }

    @Test
    void theEncoderOnlyTunesDown() {
        var rig = new Rig();
        var gojira = rig.device("Archetype Gojira X {T}");

        // HyperTune cannot tune up at all, so the encoder spans an octave down
        // rather than an octave each way: noon is -6, not 0.
        rig.turn(NOON);

        assertEquals("Transpose=6/24", rig.lastWrite(gojira));
    }

    @Test
    void aMarkedBaselineIsWhereTheDeviceSitsAtZero() {
        var rig = new Rig();
        // a keyboard pitched up 2 so a Db-major shape sounds in C minor
        var noteFx = rig.device("Note Transpose {T+2}");

        rig.turn(FAR_LEFT);
        assertEquals("Semi=38/96", rig.lastWrite(noteFx), "-12 from a +2 baseline is -10");

        rig.turn(FAR_RIGHT);
        assertEquals("Semi=50/96", rig.lastWrite(noteFx), "0 leaves it at its baseline");
    }

    @Test
    void nothingIsWrittenUntilTheEncoderMoves() {
        var rig = new Rig();
        var gojira = rig.device("Archetype Gojira X {T}");

        // the far right is already where transpose rests, so arriving there is
        // not a move — on startup we have no idea what the plugins are set to and
        // must not overwrite what was saved with the project
        rig.turn(FAR_RIGHT);

        assertEquals(0, rig.writes(gojira));
    }

    @Test
    void aDeviceNoStrategyClaimsIsLeftAlone() {
        var rig = new Rig();
        var unknown = rig.device("Serum {T}");

        rig.turn(FAR_LEFT);

        assertEquals(0, rig.writes(unknown),
            "guessing at an unknown device is how it detunes silently");
    }

    @Test
    void aDeviceAppearingMidSweepCatchesUp() {
        var rig = new Rig();
        rig.turn(FAR_LEFT);

        var gojira = rig.device("Archetype Gojira X {T}");

        assertEquals("Transpose=0/24", rig.lastWrite(gojira),
            "a device loaded while transposed must not stay at concert pitch");
    }

    @Test
    void everyStepOfTheEncoderReachesTheDevice() {
        var rig = new Rig();
        var gojira = rig.device("Archetype Gojira X {T}");

        for (int position = FAR_RIGHT; position >= FAR_LEFT; position--)
            rig.turn(position);

        assertEquals(12, rig.writes(gojira), "one write per semitone, none repeated");
        assertEquals("Transpose=0/24", rig.lastWrite(gojira));
    }
}
