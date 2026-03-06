// ---------------------------------------------------------------------------
// MapperCache — Stores mapper instances by device name + buffers pending params
// ---------------------------------------------------------------------------

class MapperCacheHW {
    constructor() {
        this._mappers = {};          // deviceName → twister mapper instance
        this._padMappers = {};       // deviceName → pad mapper instance
        this._pendingParams = {};    // buffered twister params
        this._pendingPadParams = {}; // buffered pad params
        this._pendingDevice = null;
    }

    getMapper(deviceName, factory, deps) {
        if (!factory) return null;
        if (!this._mappers[deviceName]) {
            this._mappers[deviceName] = factory(deps);
        }
        var mapper = this._mappers[deviceName];
        var pending = this._pendingParams;
        this._pendingParams = {};
        this._pendingDevice = null;
        for (var pid in pending) { mapper.feed(pid, pending[pid]); }
        return mapper;
    }

    getPadMapper(deviceName, factory) {
        if (!factory) return null;
        if (!this._padMappers[deviceName]) {
            this._padMappers[deviceName] = factory();
        }
        return this._padMappers[deviceName];
    }

    flushPendingPadParams(padMapper) {
        if (!padMapper) return;
        var pending = this._pendingPadParams;
        this._pendingPadParams = {};
        for (var pid in pending) { padMapper.onParamValueChanged(pid, pending[pid]); }
    }

    feedParam(activeMapper, id, value) {
        if (activeMapper) { activeMapper.feed(id, value); }
        else { this._pendingParams[id] = value; }
    }

    bufferPadParam(id, value) { this._pendingPadParams[id] = value; }

    onDeviceChanged(deviceName) {
        if (this._pendingDevice !== null && this._pendingDevice !== deviceName) {
            this._pendingParams = {};
            this._pendingPadParams = {};
        }
        this._pendingDevice = deviceName;
    }

    clearAll() {
        this._mappers = {};
        this._padMappers = {};
        this._pendingPadParams = {};
    }
}

var MapperCache = {};
if (typeof module !== 'undefined') module.exports = MapperCacheHW;
