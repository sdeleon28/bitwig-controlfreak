package dev.tradcode.groupctl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;

import org.junit.jupiter.api.Test;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.EventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PaintSideButton;
import dev.tradcode.groupctl.events.SideButton;
import dev.tradcode.groupctl.events.SideButtonClick;

class PadModeCtlTest {

    /** Captures every PaintSideButton emitted onto the bus. */
    private static class PaintRecorder implements IEventBusSubscriber {
        final ArrayList<PaintSideButton> paints = new ArrayList<>();

        @Override
        public void on(Event event) {
            if (event instanceof PaintSideButton p) {
                this.paints.add(p);
            }
        }

        int lastLitColor(SideButton btn) {
            int color = -1;
            for (PaintSideButton p : this.paints) {
                if (p.btn() == btn && p.color() != 0) {
                    color = p.color();
                }
            }
            return color;
        }
    }

    @Test
    void soloSelectorPaintsYellow() {
        EventBus bus = new EventBus();
        PaintRecorder recorder = new PaintRecorder();
        new PadModeCtl(bus);
        bus.subscribe(recorder);

        bus.send(new SideButtonClick(SideButton.SOLO));

        assertEquals(109, recorder.lastLitColor(SideButton.SOLO),
                "solo selector should be painted yellow (109)");
    }

    @Test
    void soloColorConstantIsYellow() {
        assertEquals(109, PadModeCtl.SOLO_COLOR);
    }
}
