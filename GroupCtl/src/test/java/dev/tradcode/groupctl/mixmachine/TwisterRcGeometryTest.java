package dev.tradcode.groupctl.mixmachine;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class TwisterRcGeometryTest {

    @Test
    void firstPageOccupiesTheBottomEightEncoders() {
        // slot 0 (page 0, param 0) is the upper-left of the bottom block
        assertEquals(5, TwisterRcGeometry.positionForSlot(0));
        assertEquals(1, TwisterRcGeometry.positionForSlot(4));
        assertEquals(8, TwisterRcGeometry.positionForSlot(3));
        for (int slot = 0; slot < 8; slot++) {
            int pos = TwisterRcGeometry.positionForSlot(slot);
            assertTrue(pos >= 1 && pos <= 8, "slot " + slot + " must land on the bottom 8");
        }
    }

    @Test
    void secondPageOccupiesTheTopEightEncoders() {
        // the top block mirrors the bottom one, shifted up by 8 positions
        assertEquals(13, TwisterRcGeometry.positionForSlot(8));
        assertEquals(9, TwisterRcGeometry.positionForSlot(12));
        assertEquals(16, TwisterRcGeometry.positionForSlot(11));
        for (int slot = 8; slot < 16; slot++) {
            int pos = TwisterRcGeometry.positionForSlot(slot);
            assertTrue(pos >= 9 && pos <= 16, "slot " + slot + " must land on the top 8");
        }
    }

    @Test
    void positionAndSlotRoundTrip() {
        for (int slot = 0; slot < TwisterRcGeometry.SLOT_COUNT; slot++)
            assertEquals(slot, TwisterRcGeometry.slotForPosition(TwisterRcGeometry.positionForSlot(slot)));
        for (int pos = 1; pos <= 16; pos++)
            assertEquals(pos, TwisterRcGeometry.positionForSlot(TwisterRcGeometry.slotForPosition(pos)));
    }

    @Test
    void slotSplitsIntoPageAndParam() {
        assertEquals(0, TwisterRcGeometry.pageForSlot(7));
        assertEquals(1, TwisterRcGeometry.pageForSlot(8));
        assertEquals(3, TwisterRcGeometry.paramForSlot(11));
        assertEquals(11, TwisterRcGeometry.slotFor(1, 3));
        assertEquals(2, TwisterRcGeometry.slotFor(0, 2));
    }

    @Test
    void outOfRangeInputsReturnSentinel() {
        assertEquals(-1, TwisterRcGeometry.slotForPosition(0));
        assertEquals(-1, TwisterRcGeometry.slotForPosition(17));
        assertEquals(-1, TwisterRcGeometry.positionForSlot(-1));
        assertEquals(-1, TwisterRcGeometry.positionForSlot(16));
    }
}
