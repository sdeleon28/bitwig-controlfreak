package dev.tradcode.groupctl.mixmachine.masterrc;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.EncoderTurned;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintEncoder;
import dev.tradcode.groupctl.events.SetEncoderValue;
import dev.tradcode.groupctl.mixmachine.events.BitwigTrackSelected;
import dev.tradcode.groupctl.mixmachine.events.MasterRcSelected;
import dev.tradcode.groupctl.mixmachine.events.RequestSelectDevice;
import dev.tradcode.groupctl.mixmachine.masterrc.events.MasterRcValueChanged;
import dev.tradcode.groupctl.mixmachine.masterrc.events.SetMasterRcValue;

class TwisterMasterRcCtlTest {

    private static boolean wroteRc(FakeEventBus bus) {
        return bus.events.stream().anyMatch(e -> e instanceof SetMasterRcValue);
    }

    private static SetMasterRcValue lastWrite(FakeEventBus bus) {
        SetMasterRcValue last = null;
        for (var e : bus.events)
            if (e instanceof SetMasterRcValue s) last = s;
        return last;
    }

    @Test
    void inactiveUntilSelected() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);

        bus.send(new EncoderTurned(5, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void selectionLightsBottomEightEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);

        bus.send(new MasterRcSelected());

        // bottom 8 encoders (positions 1..8) lit
        for (int n = 1; n <= 8; n++) {
            final int pos = n;
            assertTrue(
                bus.events.stream().anyMatch(
                    e -> e instanceof PaintEncoder pe && pe.n() == pos && pe.color() != 0),
                "encoder " + pos + " should be lit"
            );
        }
    }

    @Test
    void cachesValuesWhileInactiveAndPaintsThemOnActivation() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);

        // value arrives before the program is active: it must be remembered,
        // not pulled in again on activation.
        bus.send(new MasterRcValueChanged(0, 1.0));
        bus.clear();

        bus.send(new MasterRcSelected());

        // RC id 0 maps to position 5
        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 5 && sv.v() == 127));
    }

    @Test
    void encoderTurnWritesMasterRcAfterSelection() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new MasterRcSelected());
        bus.clear();

        // position 5 maps to RC id 0
        bus.send(new EncoderTurned(5, 127));

        var write = lastWrite(bus);
        assertNotNull(write);
        assertEquals(0, write.id());
        assertEquals(1.0, write.value(), 1e-9);
    }

    @Test
    void valueChangePaintsRingAtMappedPosition() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new MasterRcSelected());
        bus.clear();

        // RC id 0 maps to position 5
        bus.send(new MasterRcValueChanged(0, 1.0));

        assertTrue(bus.events.stream().anyMatch(
            e -> e instanceof SetEncoderValue sv && sv.n() == 5 && sv.v() == 127));
    }

    @Test
    void trackSelectionReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new MasterRcSelected());
        bus.send(new BitwigTrackSelected(10));
        bus.clear();

        bus.send(new EncoderTurned(5, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void deviceSelectionReleasesEncoders() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new MasterRcSelected());
        bus.send(new RequestSelectDevice(0));
        bus.clear();

        bus.send(new EncoderTurned(5, 127));

        assertFalse(wroteRc(bus));
    }

    @Test
    void editorPageSuppressesEncodersThenRestores() {
        FakeEventBus bus = new FakeEventBus();
        new TwisterMasterRcCtl(bus);
        bus.send(new MasterRcSelected());

        bus.send(new PageSelected(Page.EDITOR.getValue()));
        bus.clear();
        bus.send(new EncoderTurned(5, 127));
        assertFalse(wroteRc(bus), "master RCs must yield while the editor owns the Twister");

        bus.send(new PageSelected(Page.GROUPCTL.getValue()));
        bus.send(new EncoderTurned(5, 127));
        assertTrue(wroteRc(bus), "leaving the editor page restores master RC control");
    }
}
