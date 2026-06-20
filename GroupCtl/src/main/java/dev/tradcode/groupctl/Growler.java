package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

import dev.tradcode.groupctl.events.DeviceSelected;
import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.events.FxEncoderPressed;
import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.IEventBusSubscriber;
import dev.tradcode.groupctl.events.PadModeUpdated;
import dev.tradcode.groupctl.events.PageSelected;
import dev.tradcode.groupctl.events.PanModeSelected;
import dev.tradcode.groupctl.events.RequestClearMute;
import dev.tradcode.groupctl.events.RequestClearRec;
import dev.tradcode.groupctl.events.RequestClearSolo;
import dev.tradcode.groupctl.events.RequestFxSelectTrack;
import dev.tradcode.groupctl.events.RequestFxToggleMute;
import dev.tradcode.groupctl.events.RequestFxToggleRec;
import dev.tradcode.groupctl.events.RequestFxToggleSolo;
import dev.tradcode.groupctl.events.RequestSelectTrack;
import dev.tradcode.groupctl.events.ResolutionChanged;
import dev.tradcode.groupctl.events.RequestToggleMute;
import dev.tradcode.groupctl.events.RequestToggleRec;
import dev.tradcode.groupctl.events.RequestToggleSolo;
import dev.tradcode.groupctl.events.SendEncoderPressed;
import dev.tradcode.groupctl.events.TrackEncoderPressed;
import dev.tradcode.groupctl.events.VolModeSelected;
import dev.tradcode.groupctl.explorer.events.RequestSetLoop;
import dev.tradcode.groupctl.explorer.events.RequestSetMetronome;
import dev.tradcode.groupctl.explorer.events.RequestSetRecord;

public class Growler implements IEventBusSubscriber {
    IEventBus bus;
    ControllerHost host;

    public Growler(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        this.bus.subscribe(this);
        this.host = host;
    }

    protected void growl(Object o) {
        this.host.showPopupNotification(o.toString());
    }

    public void on(Event event) {
        switch (event) {
            // selections
            case RequestSelectTrack e -> this.growl(e);
            case DeviceSelected e -> this.growl(e);
            case RequestFxSelectTrack e -> this.growl(e);
            // modes
            case PadModeUpdated e -> this.growl(e);
            case VolModeSelected e -> this.growl(e);
            case PanModeSelected e -> this.growl(e);
            // pages
            case PageSelected e -> this.growl(e);
            // explorer
            case ResolutionChanged e -> this.growl(e);
            case RequestSetLoop e -> this.growl(e);
            case RequestSetMetronome e -> this.growl(e);
            case RequestSetRecord e -> this.growl(e);
            // encoder presses
            case TrackEncoderPressed e -> this.growl(e);
            case SendEncoderPressed e -> this.growl(e);
            case FxEncoderPressed e -> this.growl(e);
            // mute / solo / rec actions
            case RequestToggleMute e -> this.growl(e);
            case RequestToggleSolo e -> this.growl(e);
            case RequestToggleRec e -> this.growl(e);
            case RequestFxToggleMute e -> this.growl(e);
            case RequestFxToggleSolo e -> this.growl(e);
            case RequestFxToggleRec e -> this.growl(e);
            // clear-all actions
            case RequestClearMute e -> this.growl(e);
            case RequestClearSolo e -> this.growl(e);
            case RequestClearRec e -> this.growl(e);
            default -> { }
        }
    }
}
