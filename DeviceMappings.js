/**
 * Declarative device-to-encoder mapping configurations.
 * Each device has an array of bands with color, encoder (turn) and button (press) mappings.
 * Buttons share the same physical encoder (e.g., encoder 9 turn=Gain, press=Active).
 *
 * Note: Frequalizer is now handled by the polymorphic mapper system
 * (FrequalizerTwisterMapper). Add new non-mapper device configs here.
 */
var DeviceMappings = {};

if (typeof module !== 'undefined') module.exports = DeviceMappings;
