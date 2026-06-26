package dev.tradcode.groupctl.mixmachine.masterrc;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcExistsChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcValueChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.RequestNudgeTempo;
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

    private static RequestNudgeTempo lastTempoNudge(FakeEventBus bus) {
        RequestNudgeTempo last = null;
        for (var e : bus.events)
            if (e instanceof RequestNudgeTempo n) last = n;
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
        bus.send(new MasterRcValueChanged(0, 1.0));
        bus.clear();

        bus.send(new BitwigTrackSelected(MASTER_ID));

        // RC id 0 maps to position 5
        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 5 && sv.v() == 127));
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

        // RC id 0 maps to position 5
        bus.send(new MasterRcValueChanged(0, 1.0));

        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 5 && sv.v() == 127));
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
    void tempoEncoderNudgesByWholeBpmStepsInsteadOfWritingTheRc() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        // position 5 maps to RC id 0 (Tempo). The first turn only establishes
        // the baseline; the next two move the transport by the position delta.
        bus.send(new EncoderTurned(5, 64));
        bus.send(new EncoderTurned(5, 66));
        bus.send(new EncoderTurned(5, 65));

        assertFalse(wroteRc(bus), "the tempo encoder must not write a normalized RC value");
        assertEquals(2, bus.count(RequestNudgeTempo.class), "one nudge per real turn");
        assertEquals(-1, lastTempoNudge(bus).steps());
    }

    @Test
    void tempoEncoderSwallowsTheFirstTurnAfterActivation() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        bus.send(new EncoderTurned(5, 70));

        assertEquals(0, bus.count(RequestNudgeTempo.class),
            "the first turn only baselines the encoder position");
    }

    @Test
    void tempoBaselineResetsWhenMasterIsReclaimed() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.send(new EncoderTurned(5, 64));
        bus.send(new EncoderTurned(5, 70));

        // yield to a device, then reclaim: the next turn must re-baseline rather
        // than nudge by the gap to the stale position.
        bus.send(new RequestSelectDevice(0));
        bus.send(new BitwigTrackSelected(MASTER_ID));
        bus.clear();

        bus.send(new EncoderTurned(5, 90));

        assertEquals(0, bus.count(RequestNudgeTempo.class),
            "reclaiming master re-baselines the tempo encoder");
    }
}
