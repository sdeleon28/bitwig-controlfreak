package dev.tradcode.groupctl.mixmachine.masterrc;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderButtonPressed;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcEncoderPressed;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcNameChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcValueChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterTempoChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.RequestSetTempo;
import dev.tradcode.groupctl.mixmachine.masterrc.events.SetMasterRcValue;

class TwisterMasterRcCtlTest {

    static final int MASTER_ID = BitwigMasterRcTracker.MASTER_ID;
    static final int CYAN = 19;

    private static void allRcsExist(FakeEventBus bus) {
        for (int id = 0; id < 8; id++)
            bus.send(new MasterRcExistsChanged(id, true));
    }

    /** Last LED color painted to encoder {@code pos}, or null if untouched. */
    private static Integer ledAt(FakeEventBus bus, int pos) {
        Integer last = null;
        for (var e : bus.events)
            if (e instanceof PaintEncoder pe && pe.n() == pos) last = pe.color();
        return last;
    }

    private static boolean wroteRc(FakeEventBus bus) {
        return bus.events.stream().anyMatch(e -> e instanceof SetMasterRcValue);
    }

    private static SetMasterRcValue lastWrite(FakeEventBus bus) {
        SetMasterRcValue last = null;
        for (var e : bus.events)
            if (e instanceof SetMasterRcValue s) last = s;
        return last;
    }

    private static RequestSetTempo lastTempoSet(FakeEventBus bus) {
        RequestSetTempo last = null;
        for (var e : bus.events)
            if (e instanceof RequestSetTempo n) last = n;
        return last;
    }

    private static MasterRcEncoderPressed lastPress(FakeEventBus bus) {
        MasterRcEncoderPressed last = null;
        for (var e : bus.events)
            if (e instanceof MasterRcEncoderPressed p) last = p;
        return last;
    }

    @Test
    void inactiveUntilMasterSelected() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);

        bus.send(new EncoderTurned(6, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void detectedRcsLightCyanAcrossTheBottomEightEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        allRcsExist(bus);

        bus.send(new BitwigTrackSelected(MASTER_ID));

        // bottom 8 encoders (positions 1..8) lit cyan
        for (int n = 1; n <= 8; n++)
            assertEquals(CYAN, ledAt(bus, n), "encoder " + n + " should be cyan");
    }

    @Test
    void onlyDetectedRcsAreLit() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        // only RC id 0 (position 5) exists
        bus.send(new MasterRcExistsChanged(0, true));

        bus.send(new BitwigTrackSelected(MASTER_ID));

        assertEquals(CYAN, ledAt(bus, 5), "the detected RC must be cyan");
        // RC id 1 (position 6) is not detected -> dark
        assertEquals(0, ledAt(bus, 6), "an undetected RC must stay dark");
    }

    @Test
    void cachesValuesWhileInactiveAndPaintsThemOnActivation() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);

        // value arrives before the program is active: it must be remembered,
        // not pulled in again on activation.
        bus.send(new MasterRcValueChanged(1, 1.0));
        bus.clear();

        bus.send(new BitwigTrackSelected(MASTER_ID));

        // RC id 1 maps to position 6
        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 6 && sv.v() == 127));
    }

    @Test
    void encoderTurnWritesMasterRcAfterSelection() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        // position 6 maps to RC id 1
        bus.send(new EncoderTurned(6, 127));

        var write = lastWrite(bus);
        assertNotNull(write);
        assertEquals(1, write.id());
        assertEquals(1.0, write.value(), 1e-9);
    }

    @Test
    void valueChangePaintsRingAtMappedPosition() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        // RC id 1 maps to position 6
        bus.send(new MasterRcValueChanged(1, 1.0));

        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 6 && sv.v() == 127));
    }

    @Test
    void selectingAnotherTrackReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.send(new BitwigTrackSelected(10));
        bus.clear();

        bus.send(new EncoderTurned(6, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void deviceSelectionYieldsEncodersAndReSelectingMasterReclaimsThem() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));

        // a device borrows the encoders even though master stays selected
        bus.send(new RequestSelectDevice(0));
        bus.clear();
        bus.send(new EncoderTurned(6, 127));
        assertFalse(wroteRc(bus), "device RC must own the encoders while a device is selected");

        // re-tapping the master pad re-announces the selection (the tracker
        // re-emits BitwigTrackSelected since Bitwig won't), reclaiming them
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.send(new EncoderTurned(6, 127));
        assertTrue(wroteRc(bus), "re-selecting master reclaims the encoders from device RC");
    }

    @Test
    void editorPageSuppressesEncodersThenRestores() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));

        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.clear();
        bus.send(new EncoderTurned(6, 127));
        assertFalse(wroteRc(bus), "master RCs must yield while the editor owns the Twister");

        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.send(new EncoderTurned(6, 127));
        assertTrue(wroteRc(bus), "leaving the editor page restores master RC control");
    }

    @Test
    void tempoEncoderMapsAbsolutePositionToBpmInsteadOfWritingTheRc() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        // position 5 maps to RC id 0 (Tempo). Every turn writes an absolute BPM
        // derived from the encoder position; there is no baseline to establish.
        bus.send(new EncoderTurned(5, 64));

        assertFalse(wroteRc(bus), "the tempo encoder must not write a normalized RC value");
        assertEquals(1, bus.count(RequestSetTempo.class), "one tempo write per turn");
    }

    @Test
    void tempoEncoderWorksOnTheFirstTurnAfterActivation() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        bus.send(new EncoderTurned(5, 70));

        assertEquals(1, bus.count(RequestSetTempo.class),
            "the very first turn already sets the tempo");
    }

    @Test
    void tempoEncoderSpansThirtyToTwoHundredThirtyBpm() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        // far left is the floor, far right the ceiling, regardless of where the
        // tempo happened to be when the encoder was activated.
        bus.send(new EncoderTurned(5, 0));
        assertEquals(30, lastTempoSet(bus).bpm());

        bus.send(new EncoderTurned(5, 127));
        assertEquals(230, lastTempoSet(bus).bpm());
    }

    @Test
    void tempoRingReflectsTheDawTempoNotTheRcValue() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        // 130 BPM sits at the middle of the 30..230 range -> position 64.
        // The tempo RC's own normalized value is irrelevant to the ring.
        bus.send(new MasterRcValueChanged(0, 1.0));
        bus.send(new MasterTempoChanged(130.0));

        // RC id 0 (Tempo) maps to position 5
        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 5 && sv.v() == 64),
            "the tempo ring must track the DAW tempo");
    }

    @Test
    void cachedTempoPaintsTheRingOnActivation() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);

        // tempo arrives before the program is active: it must be remembered and
        // painted onto the ring when the master is selected, so takeover starts
        // from the DAW's real tempo rather than a stale position.
        bus.send(new MasterTempoChanged(230.0));
        bus.clear();

        bus.send(new BitwigTrackSelected(MASTER_ID));

        // 230 BPM is the ceiling -> position 127; RC id 0 maps to position 5
        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 5 && sv.v() == 127));
    }

    @Test
    void encoderPressGrowlsTheCorrespondingParamName() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        allRcsExist(bus);
        bus.send(new MasterRcNameChanged(1, "Reverb"));
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        // position 6 maps to RC id 1
        bus.send(new EncoderButtonPressed(6));

        var press = lastPress(bus);
        assertNotNull(press);
        assertEquals("Reverb", press.name());
        assertEquals("Reverb", press.toString());
    }

    @Test
    void encoderPressIsSilentWhileInactive() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        allRcsExist(bus);
        bus.send(new MasterRcNameChanged(1, "Reverb"));

        bus.send(new EncoderButtonPressed(6));

        assertNull(lastPress(bus), "the program must not growl when another owns the encoders");
    }

    @Test
    void undetectedRcDoesNotGrowlOnPress() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        // only RC id 0 exists; RC id 1 (position 6) does not
        bus.send(new MasterRcExistsChanged(0, true));
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        bus.send(new EncoderButtonPressed(6));

        assertNull(lastPress(bus), "pressing an empty RC encoder must stay silent");
    }
}
