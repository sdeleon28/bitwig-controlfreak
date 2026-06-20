package dev.tradcode.groupctl;

import com.bitwig.extension.controller.api.ControllerHost;

public class BitwigScheduler implements Scheduler {
    private final ControllerHost host;

    public BitwigScheduler(ControllerHost host) {
        this.host = host;
    }

    public void schedule(Runnable task, long delayMs) {
        this.host.scheduleTask(task, delayMs);
    }
}
