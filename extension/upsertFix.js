WeakMap.prototype.getOrInsert ??= function (key, defaultValue) {
    if (!this.has(key)) { this.set(key, defaultValue); }
    return this.get(key);
};

WeakMap.prototype.getOrInsertComputed ??= function (key, callbackFunction) {
    if (!this.has(key)) { this.set(key, callbackFunction(key)); }
    return this.get(key);
};

Map.prototype.getOrInsert ??= function (key, defaultValue) {
    if (!this.has(key)) { this.set(key, defaultValue); }
    return this.get(key);
};

Map.prototype.getOrInsertComputed ??= function (key, callbackFunction) {
    if (!this.has(key)) { this.set(key, callbackFunction(key)); }
    return this.get(key);
};
