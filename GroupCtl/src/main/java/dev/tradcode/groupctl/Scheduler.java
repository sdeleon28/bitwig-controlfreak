package dev.tradcode.groupctl;

public interface Scheduler {
    void schedule(Runnable task, long delayMs);
}
