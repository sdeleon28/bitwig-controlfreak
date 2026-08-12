package dev.tradcode.groupctl.params;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.bitwig.extension.controller.api.Device;
import com.bitwig.extension.controller.api.DirectParameterValueDisplayObserver;

/**
 * The direct-parameter boundary for a single device: wires Bitwig's id, name and
 * display observers into a {@link ParamIndex} and writes values back by name.
 *
 * Ids are kept in both the reported and canonical form — lookups are canonical
 * (the {@link ParamIndex#PREFIX} is noise) while writes use whatever Bitwig
 * originally reported.
 */
public class DeviceParams {
    static final int NAME_CHARS = 64;
    static final int DISPLAY_CHARS = 32;

    final ParamIndex index = new ParamIndex();
    final Map<String, String> rawById = new HashMap<>();
    final Map<String, String> displayById = new HashMap<>();
    final Device device;
    final DirectParameterValueDisplayObserver displays;

    public DeviceParams(Device device) {
        this.device = device;
        device.addDirectParameterIdObserver(ids -> {
            this.index.setIds(ids);
            for (String id : ids)
                this.rawById.put(ParamIndex.canonical(id), id);
        });
        device.addDirectParameterNameObserver(
            NAME_CHARS, (id, name) -> this.index.setName(id, name));
        this.displays = device.addDirectParameterValueDisplayObserver(
            DISPLAY_CHARS,
            (id, display) -> this.displayById.put(ParamIndex.canonical(id), display));
    }

    public String resolve(List<String> aliases) {
        return this.index.resolve(aliases);
    }

    public List<String> namesMatching(String needle) {
        return this.index.namesMatching(needle);
    }

    public String nameOf(String id) {
        return this.index.nameOf(id);
    }

    public int size() {
        return this.index.size();
    }

    public String displayOf(String id) {
        return this.displayById.get(id);
    }

    /**
     * Bitwig only streams displayed values for ids we ask for, so watching has to
     * be declared once a caller knows which param it cares about.
     */
    public void watchDisplay(String id) {
        this.displays.setObservedParameterIds(
            new String[] { this.rawById.getOrDefault(id, id) });
    }

    /**
     * Sets the param to the fraction {@code value / outOf}.
     *
     * Bitwig's own {@code setDirectParameterValueNormalized} divides by
     * {@code range - 1}, not by {@code range} — its "range" is the number of
     * discrete positions, so a param with 25 positions spans 24 intervals. Left
     * uncorrected, asking for the exact midpoint lands between two steps and
     * snaps to the wrong one, which makes the centre value unreachable. Callers
     * here say what fraction they want and this puts the interval back.
     */
    public void write(String id, int value, int outOf) {
        this.device.setDirectParameterValueNormalized(
            this.rawById.getOrDefault(id, id), value, outOf + 1);
    }
}
