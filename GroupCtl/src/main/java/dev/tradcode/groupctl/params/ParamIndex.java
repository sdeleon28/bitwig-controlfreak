package dev.tradcode.groupctl.params;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A live directory of one device's direct parameters, keyed by the label the
 * plugin shows rather than the id Bitwig reports.
 *
 * Direct-parameter ids are opaque and volatile: for a Bitwig device preset they
 * are content hashes ({@code CONTENTS/PID5e65eb21}) that change when the preset
 * is rebuilt, and for a plugin they are whatever the vendor assigns. Labels are
 * stable, human-readable and verifiable against the plugin GUI, so callers name
 * what they want and this resolves it.
 *
 * Matching is done on a squashed form of the label (lowercase, alphanumerics
 * only) so {@code "Pitch (semi)"} answers to {@code "pitch semi"}. Exact matches
 * across all aliases are tried before any substring match, and ties are broken
 * by the plugin's own parameter order.
 */
public class ParamIndex {
    public static final String PREFIX = "ROOT_GENERIC_MODULE/";

    final List<String> order = new ArrayList<>();
    final Map<String, String> nameById = new LinkedHashMap<>();

    public void setIds(String[] ids) {
        this.order.clear();
        for (String id : ids)
            this.order.add(canonical(id));
    }

    public void setName(String id, String name) {
        this.nameById.put(canonical(id), name);
    }

    public String resolve(List<String> aliases) {
        for (String alias : aliases) {
            String hit = firstMatching(alias, true);
            if (hit != null)
                return hit;
        }
        for (String alias : aliases) {
            String hit = firstMatching(alias, false);
            if (hit != null)
                return hit;
        }
        return null;
    }

    public String nameOf(String id) {
        return this.nameById.get(canonical(id));
    }

    /** Labels (with ids) whose squashed form contains {@code needle}'s. */
    public List<String> namesMatching(String needle) {
        String squashed = squash(needle);
        var hits = new ArrayList<String>();
        for (String id : candidates()) {
            String name = this.nameById.get(id);
            if (name != null && squash(name).contains(squashed))
                hits.add(name + " (" + id + ")");
        }
        return hits;
    }

    public int size() {
        return candidates().size();
    }

    private String firstMatching(String alias, boolean exact) {
        String squashed = squash(alias);
        if (squashed.isEmpty())
            return null;
        for (String id : candidates()) {
            String name = this.nameById.get(id);
            if (name == null)
                continue;
            String candidate = squash(name);
            if (exact ? candidate.equals(squashed) : candidate.contains(squashed))
                return id;
        }
        return null;
    }

    private List<String> candidates() {
        var all = new ArrayList<>(this.order);
        for (String id : this.nameById.keySet())
            if (!all.contains(id))
                all.add(id);
        return all;
    }

    public static String canonical(String id) {
        return id.startsWith(PREFIX) ? id.substring(PREFIX.length()) : id;
    }

    private static String squash(String s) {
        var sb = new StringBuilder();
        for (char c : s.toCharArray())
            if (Character.isLetterOrDigit(c))
                sb.append(Character.toLowerCase(c));
        return sb.toString();
    }
}
