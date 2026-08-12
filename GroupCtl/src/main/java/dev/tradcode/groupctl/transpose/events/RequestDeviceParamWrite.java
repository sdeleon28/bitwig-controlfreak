package dev.tradcode.groupctl.transpose.events;

import java.util.List;

import dev.tradcode.groupctl.events.Event;
import dev.tradcode.groupctl.transpose.MarkedDevice;

/**
 * Set the first param answering to {@code aliases} to the fraction
 * {@code value / outOf}. Which param that is, and how a fraction becomes a
 * normalized write, is the tracker's business.
 */
public record RequestDeviceParamWrite(
    MarkedDevice device, List<String> aliases, int value, int outOf
) implements Event { }
