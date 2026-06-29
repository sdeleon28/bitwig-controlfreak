package dev.tradcode.groupctl.editor.followplayhead;

import dev.tradcode.groupctl.events.IEventBus;

/**
 * Make the editor follow the play cursor, toggled from USER_2 on either editor
 * page. Self-contained: deleting the one line that constructs this in
 * {@code Editor} removes the feature whole.
 */
public class FollowPlayhead {
    public FollowPlayhead(IEventBus bus) {
        new FollowPlayheadCtl(bus);
    }
}
