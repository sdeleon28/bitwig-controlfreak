var MapperCacheHW = require('./MapperCache');
var t = require('./test-assert');
var assert = t.assert;

// ---- helpers ----

function fakeMapper(label) {
    var _fedParams = [];
    return {
        label: label || 'mapper',
        _fedParams: _fedParams,
        feed: function(id, value) { _fedParams.push({ id: id, value: value }); return true; }
    };
}

function fakePadMapper() {
    var _paramValues = [];
    return {
        _paramValues: _paramValues,
        onParamValueChanged: function(id, value) { _paramValues.push({ id: id, value: value }); }
    };
}

// ---- getMapper tests ----

// getMapper creates instance on first call
(function() {
    var cache = new MapperCacheHW();
    var callCount = 0;
    var factory = function(deps) { callCount++; return fakeMapper(); };
    var mapper = cache.getMapper('Dev', factory, {});
    assert(mapper !== null, 'should return mapper');
    assert(callCount === 1, 'factory called once');
})();

// getMapper returns cached instance on second call
(function() {
    var cache = new MapperCacheHW();
    var callCount = 0;
    var factory = function(deps) { callCount++; return fakeMapper(); };
    var m1 = cache.getMapper('Dev', factory, {});
    var m2 = cache.getMapper('Dev', factory, {});
    assert(m1 === m2, 'should return same instance');
    assert(callCount === 1, 'factory called only once');
})();

// getMapper returns null when no factory
(function() {
    var cache = new MapperCacheHW();
    var result = cache.getMapper('Dev', null, {});
    assert(result === null, 'should return null without factory');
})();

// getMapper feeds pending params and clears them
(function() {
    var cache = new MapperCacheHW();
    cache._pendingParams = { 'PID1': 0.5, 'PID2': 0.8 };
    var mapper = cache.getMapper('Dev', function() { return fakeMapper(); }, {});
    assert(mapper._fedParams.length === 2, 'should feed 2 pending params');
    assert(Object.keys(cache._pendingParams).length === 0, 'pending params should be cleared');
    assert(cache._pendingDevice === null, 'pending device should be cleared');
})();

// getMapper passes deps to factory
(function() {
    var cache = new MapperCacheHW();
    var receivedDeps = null;
    var factory = function(deps) { receivedDeps = deps; return fakeMapper(); };
    cache.getMapper('Dev', factory, { painter: 'p' });
    assert(receivedDeps.painter === 'p', 'should pass deps to factory');
})();

// different devices get different instances
(function() {
    var cache = new MapperCacheHW();
    var m1 = cache.getMapper('DevA', function() { return fakeMapper('A'); }, {});
    var m2 = cache.getMapper('DevB', function() { return fakeMapper('B'); }, {});
    assert(m1 !== m2, 'different devices should get different instances');
    assert(m1.label === 'A', 'DevA should have label A');
    assert(m2.label === 'B', 'DevB should have label B');
})();

// ---- getPadMapper tests ----

// getPadMapper creates instance on first call
(function() {
    var cache = new MapperCacheHW();
    var callCount = 0;
    var factory = function() { callCount++; return fakePadMapper(); };
    var pm = cache.getPadMapper('Dev', factory);
    assert(pm !== null, 'should return pad mapper');
    assert(callCount === 1, 'factory called once');
})();

// getPadMapper returns cached instance on second call
(function() {
    var cache = new MapperCacheHW();
    var callCount = 0;
    var factory = function() { callCount++; return fakePadMapper(); };
    var pm1 = cache.getPadMapper('Dev', factory);
    var pm2 = cache.getPadMapper('Dev', factory);
    assert(pm1 === pm2, 'should return same instance');
    assert(callCount === 1, 'factory called only once');
})();

// getPadMapper returns null when no factory
(function() {
    var cache = new MapperCacheHW();
    var result = cache.getPadMapper('Dev', null);
    assert(result === null, 'should return null without factory');
})();

// ---- flushPendingPadParams tests ----

// flushPendingPadParams forwards buffered params and clears them
(function() {
    var cache = new MapperCacheHW();
    cache._pendingPadParams = { 'PID_MODE': 0.5, 'PID_OTHER': 0.3 };
    var pm = fakePadMapper();
    cache.flushPendingPadParams(pm);
    assert(pm._paramValues.length === 2, 'should forward 2 params');
    assert(Object.keys(cache._pendingPadParams).length === 0, 'pending pad params should be cleared');
})();

// flushPendingPadParams is no-op when pad mapper is null
(function() {
    var cache = new MapperCacheHW();
    cache._pendingPadParams = { 'PID_MODE': 0.5 };
    cache.flushPendingPadParams(null);
    assert(cache._pendingPadParams['PID_MODE'] === 0.5, 'pending pad params should remain');
})();

// ---- feedParam tests ----

// feedParam feeds active mapper directly
(function() {
    var cache = new MapperCacheHW();
    var mapper = fakeMapper();
    cache.feedParam(mapper, 'PID1', 0.7);
    assert(mapper._fedParams.length === 1, 'should feed mapper');
    assert(mapper._fedParams[0].id === 'PID1', 'correct id');
    assert(mapper._fedParams[0].value === 0.7, 'correct value');
    assert(Object.keys(cache._pendingParams).length === 0, 'should not buffer');
})();

// feedParam buffers when no active mapper
(function() {
    var cache = new MapperCacheHW();
    cache.feedParam(null, 'PID1', 0.5);
    assert(cache._pendingParams['PID1'] === 0.5, 'should buffer param');
})();

// feedParam overwrites previous buffered value for same param
(function() {
    var cache = new MapperCacheHW();
    cache.feedParam(null, 'PID1', 0.5);
    cache.feedParam(null, 'PID1', 0.9);
    assert(cache._pendingParams['PID1'] === 0.9, 'should have latest value');
})();

// ---- bufferPadParam tests ----

// bufferPadParam stores value
(function() {
    var cache = new MapperCacheHW();
    cache.bufferPadParam('PID_MODE', 0.25);
    assert(cache._pendingPadParams['PID_MODE'] === 0.25, 'should buffer pad param');
})();

// ---- onDeviceChanged tests ----

// onDeviceChanged clears pending params when device changes
(function() {
    var cache = new MapperCacheHW();
    cache._pendingDevice = 'DevA';
    cache._pendingParams = { 'PID1': 0.5 };
    cache._pendingPadParams = { 'PID2': 0.3 };
    cache.onDeviceChanged('DevB');
    assert(Object.keys(cache._pendingParams).length === 0, 'pending params cleared');
    assert(Object.keys(cache._pendingPadParams).length === 0, 'pending pad params cleared');
    assert(cache._pendingDevice === 'DevB', 'pending device updated');
})();

// onDeviceChanged preserves pending params when same device
(function() {
    var cache = new MapperCacheHW();
    cache._pendingDevice = 'DevA';
    cache._pendingParams = { 'PID1': 0.5 };
    cache.onDeviceChanged('DevA');
    assert(cache._pendingParams['PID1'] === 0.5, 'pending params preserved for same device');
})();

// onDeviceChanged sets pending device from null (first call)
(function() {
    var cache = new MapperCacheHW();
    cache._pendingParams = { 'PID1': 0.5 };
    cache.onDeviceChanged('DevA');
    assert(cache._pendingParams['PID1'] === 0.5, 'pending params preserved on first device');
    assert(cache._pendingDevice === 'DevA', 'pending device set');
})();

// ---- clearAll tests ----

// clearAll nukes mappers, pad mappers, and pending pad params
(function() {
    var cache = new MapperCacheHW();
    cache._mappers['Dev'] = fakeMapper();
    cache._padMappers['Dev'] = fakePadMapper();
    cache._pendingPadParams = { 'PID': 0.5 };
    cache._pendingParams = { 'PID2': 0.3 };
    cache.clearAll();
    assert(Object.keys(cache._mappers).length === 0, 'mappers cleared');
    assert(Object.keys(cache._padMappers).length === 0, 'pad mappers cleared');
    assert(Object.keys(cache._pendingPadParams).length === 0, 'pending pad params cleared');
    assert(cache._pendingParams['PID2'] === 0.3, 'pending params NOT cleared');
})();

// ---- integration tests ----

// full cycle: buffer params → getMapper feeds them → clearAll resets
(function() {
    var cache = new MapperCacheHW();
    cache.feedParam(null, 'PID1', 0.5);
    cache.feedParam(null, 'PID2', 0.8);
    var mapper = cache.getMapper('Dev', function() { return fakeMapper(); }, {});
    assert(mapper._fedParams.length === 2, 'pending params fed to mapper');
    cache.clearAll();
    assert(cache._mappers['Dev'] === undefined, 'mapper cleared');
})();

// instance survives across multiple getMapper calls (no re-creation)
(function() {
    var cache = new MapperCacheHW();
    var callCount = 0;
    var factory = function() { callCount++; return fakeMapper(); };
    var m1 = cache.getMapper('Dev', factory, {});
    cache.feedParam(null, 'PID1', 0.5);
    var m2 = cache.getMapper('Dev', factory, {});
    assert(m1 === m2, 'same instance returned');
    assert(callCount === 1, 'factory called only once');
    assert(m2._fedParams.length === 1, 'pending param fed on second getMapper');
    assert(m2._fedParams[0].id === 'PID1', 'correct param fed');
})();

process.exit(t.summary('MapperCache'));
