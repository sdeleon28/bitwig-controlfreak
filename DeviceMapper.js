/**
 * Maps device parameters to Twister encoders based on declarative config.
 */
class DeviceMapperHW {
    /**
     * @param {Object} deps
     * @param {Object} deps.twister - Twister instance
     * @param {Object} deps.bitwig - Bitwig namespace
     * @param {Object} deps.deviceMappings - DeviceMappings data
     * @param {boolean} deps.debug - Debug flag
     * @param {Function} deps.println - Print function
     */
    constructor(deps) {
        deps = deps || {};
        this.twister = deps.twister || null;
        this.bitwig = deps.bitwig || null;
        this.host = deps.host || null;
        this.deviceMappings = deps.deviceMappings || {};
        this.debug = deps.debug || false;
        this.println = deps.println || function() {};

        this._paramValues = {};
        this._activeParamToEncoder = {};
        this._activeParamToEncoders = {};
        this._genericMode = false;
    }

    hasMapping(deviceName) {
        return !!this.deviceMappings[deviceName];
    }

    getPadConfig(deviceName) {
        var mapping = this.deviceMappings[deviceName];
        if (!mapping) return null;
        return mapping.pads || null;
    }

    applyMapping(deviceName) {
        var mapping = this.deviceMappings[deviceName];
        if (!mapping) return;

        var bands = mapping.bands || mapping;

        this._genericMode = false;
        this.twister.unlinkAll();

        // Build band-active maps
        this._activeParamToEncoders = {};

        // Build assignments: merge turn + press for shared encoders
        var assignments = {};

        for (var b = 0; b < bands.length; b++) {
            var band = bands[b];
            var color = band.color;

            var bandEncoders = [];
            for (var e = 0; e < band.encoders.length; e++) {
                var enc = band.encoders[e];
                bandEncoders.push(enc.encoder);
                if (!assignments[enc.encoder]) {
                    assignments[enc.encoder] = { color: color };
                }
                assignments[enc.encoder].turnParamId = enc.paramId;
            }

            var activeParamId = null;
            for (var bt = 0; bt < band.buttons.length; bt++) {
                var btn = band.buttons[bt];
                if (!assignments[btn.encoder]) {
                    assignments[btn.encoder] = { color: color };
                }
                assignments[btn.encoder].pressParamId = btn.paramId;
                if (btn.value !== undefined) {
                    assignments[btn.encoder].pressValue = btn.value;
                    assignments[btn.encoder].pressResolution = btn.resolution;
                    if (btn.releaseValue !== undefined) {
                        assignments[btn.encoder].releaseValue = btn.releaseValue;
                    }
                } else {
                    activeParamId = btn.paramId;
                }
            }

            if (activeParamId) {
                this._activeParamToEncoders[activeParamId] = bandEncoders;
            }
        }

        // Apply all assignments
        var device = this.bitwig.getCursorDevice();
        var self = this;

        for (var encoderNum in assignments) {
            var assignment = assignments[encoderNum];

            var turnCb = null;
            if (assignment.turnParamId) {
                turnCb = (function(paramId) {
                    return function(value) {
                        device.setDirectParameterValueNormalized(paramId, value, 128);
                    };
                })(assignment.turnParamId);
            }

            var pressCb = null;
            if (assignment.pressParamId) {
                if (assignment.pressValue !== undefined) {
                    pressCb = (function(paramId, value, releaseValue, resolution) {
                        return function(pressed) {
                            if (pressed) {
                                device.setDirectParameterValueNormalized(paramId, value, resolution);
                            } else if (releaseValue !== undefined) {
                                device.setDirectParameterValueNormalized(paramId, releaseValue, resolution);
                            }
                        };
                    })(assignment.pressParamId, assignment.pressValue, assignment.releaseValue, assignment.pressResolution);
                } else {
                    pressCb = (function(paramId) {
                        return function(pressed) {
                            if (!pressed) return;
                            var current = self._paramValues[paramId] || 0;
                            var newValue = current >= 0.5 ? 0 : 127;
                            device.setDirectParameterValueNormalized(paramId, newValue, 128);
                            self._paramValues[paramId] = newValue / 127;
                            var bandEncoders = self._activeParamToEncoders[paramId];
                            if (bandEncoders) {
                                for (var i = 0; i < bandEncoders.length; i++) {
                                    if (newValue >= 64) {
                                        self.twister.setEncoderBrightness(bandEncoders[i], 47);
                                    } else {
                                        self.twister.setEncoderOff(bandEncoders[i]);
                                    }
                                }
                            }
                        };
                    })(assignment.pressParamId);
                }
            }

            var num = parseInt(encoderNum);

            this.twister.linkEncoderToBehavior(num, turnCb, pressCb, assignment.color);

            if (assignment.turnParamId) {
                var currentValue = self._paramValues[assignment.turnParamId];
                if (currentValue !== undefined) {
                    this.twister.setEncoderLED(num, Math.round(currentValue * 127));
                }
                self._activeParamToEncoder[assignment.turnParamId] = num;
            }
        }

        // Set initial brightness based on known active state
        for (var apId in this._activeParamToEncoders) {
            var val = this._paramValues[apId];
            var encs = this._activeParamToEncoders[apId];
            for (var i = 0; i < encs.length; i++) {
                if (val !== undefined && val < 0.5) {
                    this.twister.setEncoderOff(encs[i]);
                } else {
                    this.twister.setEncoderBrightness(encs[i], 47);
                }
            }
        }

        if (this.debug) this.println("Applied device mapping: " + deviceName);
    }

    onParamValueChanged(id, value) {
        var normalizedId = id.replace('ROOT_GENERIC_MODULE/', '');
        this._paramValues[normalizedId] = value;
        var encoderNum = this._activeParamToEncoder[normalizedId];
        if (encoderNum !== undefined) {
            this.twister.setEncoderLED(encoderNum, Math.round(value * 127));
        }
        var bandEncoders = this._activeParamToEncoders[normalizedId];
        if (bandEncoders) {
            for (var i = 0; i < bandEncoders.length; i++) {
                if (value >= 0.5) {
                    this.twister.setEncoderBrightness(bandEncoders[i], 47);
                } else {
                    this.twister.setEncoderOff(bandEncoders[i]);
                }
            }
        }
    }

    applyGenericMapping() {
        this._genericMode = true;
        this.twister.unlinkAll();
        this._activeParamToEncoder = {};

        var paramIds = this.bitwig.getDirectParamIds();
        if (!paramIds || paramIds.length === 0) return;

        var device = this.bitwig.getCursorDevice();
        var self = this;
        var color = { r: 0, g: 50, b: 255 };
        var count = Math.min(paramIds.length, 16);

        for (var i = 0; i < count; i++) {
            var encoderNum = i + 1;
            var paramId = paramIds[i];

            var turnCb = (function(pid) {
                return function(value) {
                    device.setDirectParameterValueNormalized(pid, value, 128);
                };
            })(paramId);

            var pressCb = (function(pid, bw, h) {
                return function(pressed) {
                    if (!pressed) return;
                    var name = bw.getDirectParamName(pid);
                    if (name && h) h.showPopupNotification(name);
                };
            })(paramId, this.bitwig, this.host);
            this.twister.linkEncoderToBehavior(encoderNum, turnCb, pressCb, color);

            var currentValue = self._paramValues[paramId];
            if (currentValue !== undefined) {
                this.twister.setEncoderLED(encoderNum, Math.round(currentValue * 127));
            }
            self._activeParamToEncoder[paramId] = encoderNum;
        }
    }

    onDirectParamsChanged() {
        if (this._genericMode) {
            this.applyGenericMapping();
        }
    }

    resetGenericMode() {
        this._genericMode = false;
    }

    clearParamValues() {
        this._paramValues = {};
        this._activeParamToEncoder = {};
        this._activeParamToEncoders = {};
        this._genericMode = false;
    }
}

var DeviceMapper = {};
if (typeof module !== 'undefined') module.exports = DeviceMapperHW;
