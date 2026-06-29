package dev.tradcode.groupctl.editor.followplayhead;

import dev.tradcode.groupctl.editor.EditorConstants;
import dev.tradcode.groupctl.editor.GridGeometry;
import dev.tradcode.groupctl.editor.events.EditorPageChanged;
import dev.tradcode.groupctl.editor.events.EditorPlaybackPosition;
import dev.tradcode.groupctl.editor.events.EditorResolutionChanged;
import dev.tradcode.groupctl.editor.events.RequestEditorPage;

import dev.tradcode.groupctl.Page;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PaintTopButton;
import dev.tradcode.groupctl.events.TopButton;
import dev.tradcode.groupctl.events.TopButtonClick;

/**
 * Keeps the editor's horizontal page chasing the play cursor. USER_2 on the
 * bottom editor page toggles the chase: lit while following, dark while idle.
 * When following, every playhead tick that lands on a page off-screen asks the
 * horizontal pager to walk there, so the notes under the cursor stay in view.
 *
 * The toggle button only lives on the bottom page (the top page hands USER_2 to
 * the preset pager), but the chase itself runs on either editor page.
 */
public class FollowPlayheadCtl implements IEventBusSubscriber {
    static final TopButton TOGGLE = TopButton.USER_2;
    static final int ENABLED_COLOR = 45; // blue, mirrors the playhead sweep

    IEventBus bus;
    boolean buttonActive = false;
    boolean editorActive = false;
    boolean enabled = false;
    int denominator = EditorConstants.DEFAULT_DENOMINATOR;
    int currentPage = 0;
    double playheadBeat = -1.0;

    public FollowPlayheadCtl(IEventBus bus) {
        this.bus = bus;
        this.bus.subscribe(this);
    }

    private void paint() {
        if (!this.buttonActive)
            return;
        this.bus.send(new PaintTopButton(TOGGLE, this.enabled ? ENABLED_COLOR : 0));
    }

    private int playheadPage() {
        double beatsPerPage = EditorConstants.GRID_COLS * GridGeometry.beatsPerStep(this.denominator);
        return (int) (this.playheadBeat / beatsPerPage);
    }

    private void follow() {
        if (!this.enabled || !this.editorActive || this.playheadBeat < 0)
            return;
        int delta = this.playheadPage() - this.currentPage;
        if (delta != 0)
            this.bus.send(new RequestEditorPage(delta, false));
    }

    public void on(Event event) {
        switch (event) {
            case PageSelected(int n) -> {
                this.buttonActive = n == EditorConstants.PAGE_INDEX_BOTTOM;
                this.editorActive = Page.isEditorPage(n);
                this.paint();
            }
            case TopButtonClick(var btn) when this.buttonActive && btn == TOGGLE -> {
                this.enabled = !this.enabled;
                this.paint();
                this.follow();
            }
            case EditorResolutionChanged(int denominator) -> this.denominator = denominator;
            case EditorPageChanged(int page, int total) -> this.currentPage = page;
            case EditorPlaybackPosition(double beat) -> {
                this.playheadBeat = beat;
                this.follow();
            }
            default -> { }
        }
    }
}
