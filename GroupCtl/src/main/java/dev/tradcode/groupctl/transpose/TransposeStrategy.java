package dev.tradcode.groupctl.transpose;

/**
 * Everything one kind of device knows about being transposed: whether it is that
 * kind, and what to write to it for a given downtune. A device that isn't its
 * kind is simply ignored, so every strategy sees every device and nothing has to
 * arbitrate between them.
 *
 * One implementation per device type, and they are expected to duplicate each
 * other. Every plugin has its own range, direction and resolution, and the moment
 * those are folded into one parameterised writer the parameters stop describing
 * any device in particular — a wrong range is silent, the device just moves by
 * the wrong amount. A strategy that is only ever read next to the plugin it
 * drives can hardcode whatever that plugin actually does.
 *
 * A strategy never touches a device: it asks for a param write on the bus and
 * the tracker does it, so what a strategy knows is arithmetic and param labels.
 */
public interface TransposeStrategy {
    /** Transposes the device by {@code downtune} semitones, between -12 and 0. */
    void apply(int downtune, MarkedDevice device);
}
