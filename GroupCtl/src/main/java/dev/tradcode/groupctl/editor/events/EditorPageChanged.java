package dev.tradcode.groupctl.editor.events;

import dev.tradcode.groupctl.events.Event;

public record EditorPageChanged(int page, int totalPages) implements Event {
    @Override
    public String toString() {
        return "Page " + (this.page + 1) + "/" + this.totalPages;
    }
}
