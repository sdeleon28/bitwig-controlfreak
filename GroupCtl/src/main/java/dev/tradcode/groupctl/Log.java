package dev.tradcode.groupctl;

public class Log extends Event {
    public String message;

    public Log(String message) {
        this.message = message;
    }

    public String toString() {
        return "Log(message='" + this.message + "')";
    }
}
