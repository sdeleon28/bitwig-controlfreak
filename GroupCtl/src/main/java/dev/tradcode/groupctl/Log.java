package dev.tradcode.groupctl;

import dev.tradcode.groupctl.events.Event;

public class Log extends Event {
    public String message;

    public Log(String message) {
        this.message = message;
    }

    public String toString() {
        return "Log(message='" + this.message + "')";
    }
}
