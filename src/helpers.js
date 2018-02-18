
function forEachArray(arr, cb) {
    let r;
    for (let i = 0; i < arr.length; i++) {
        r = cb(arr[i], i);
        if (r === false) { return false; }
    }
    return r;
}
function forEachSet(set, cb) {
    let r;
    for (let v of set) {
        r = cb(v);
        if (r === false) { return false; }
    }
    return r;
}
function genForEachArray(arr) {
    return cb => { return forEachArray(arr, cb); };
}
function genForEachSet(arr) {
    return cb => { return forEachSet(arr, cb); };
}

function gaussianBoxMuller(u, v) {
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

module.exports = {
    forEachArray, genForEachArray,
    forEachSet, genForEachSet,
    gaussianBoxMuller };
