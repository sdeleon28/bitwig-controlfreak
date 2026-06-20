package dev.tradcode.groupctl;

import java.util.HashMap;
import java.util.Map;

import com.bitwig.extension.controller.api.ControllerHost;
import com.bitwig.extension.controller.api.CursorDevice;
import com.bitwig.extension.controller.api.CursorTrack;

import dev.tradcode.groupctl.events.IEventBus;
import dev.tradcode.groupctl.events.Log;

public class PluginLogger {
    // Flip to false to silence the logger.
    static final boolean ACTIVE = true;

    // A freshly-selected device delivers its parameter values in one burst; we
    // absorb that silently so the first thing logged is the first param touched.
    static final long SETTLE_MS = 400;

    static final String ID_PREFIX = "ROOT_GENERIC_MODULE/";

    final IEventBus bus;

    final Map<String, Integer> indexById = new HashMap<>();
    final Map<String, String> nameById = new HashMap<>();
    final Map<String, String> displayById = new HashMap<>();
    final Map<String, Double> dirty = new HashMap<>();
    boolean dirtyFlag = false;
    boolean ready = false;

    public PluginLogger(IEventBus bus, ControllerHost host) {
        this.bus = bus;
        if (!ACTIVE)
            return;

        CursorTrack cursorTrack = host.createCursorTrack(
            "groupctl-pluginlogger-cursor", "Plugin Logger Cursor", 0, 0, true);
        CursorDevice cursorDevice = cursorTrack.createCursorDevice();

        cursorDevice.name().markInterested();
        cursorDevice.name().addValueObserver(name -> {
            this.ready = false;
            if (name == null || name.isEmpty()) {
                this.log("no device selected");
                return;
            }
            this.log("device: " + name + " — touch a param to log it");
            host.scheduleTask(() -> this.ready = true, SETTLE_MS);
        });

        cursorDevice.addDirectParameterIdObserver(ids -> {
            this.indexById.clear();
            for (int i = 0; i < ids.length; i++)
                this.indexById.put(canonical(ids[i]), i);
        });
        cursorDevice.addDirectParameterNameObserver(64, (id, name) ->
            this.nameById.put(canonical(id), name));
        cursorDevice.addDirectParameterValueDisplayObserver(32, (id, display) ->
            this.displayById.put(canonical(id), display));
        cursorDevice.addDirectParameterNormalizedValueObserver((id, value) -> {
            if (!this.ready)
                return;
            this.dirty.put(canonical(id), value);
            this.dirtyFlag = true;
        });
    }

    public void flush() {
        if (!this.dirtyFlag)
            return;
        this.dirty.forEach((id, value) -> {
            String index = this.indexById.containsKey(id)
                ? String.valueOf(this.indexById.get(id)) : "?";
            this.log(
                "index=" + index +
                " | label=\"" + this.nameById.getOrDefault(id, "?") + "\"" +
                " | id=" + id +
                " | value=" + value +
                " | display=" + this.displayById.getOrDefault(id, "?"));
        });
        this.dirty.clear();
        this.dirtyFlag = false;
    }

    private static String canonical(String id) {
        return id.replace(ID_PREFIX, "");
    }

    private void log(String msg) {
        this.bus.send(new Log("[PluginLogger] " + msg));
    }
}
