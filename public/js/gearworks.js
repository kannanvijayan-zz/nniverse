(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
(function (global){
'use strict';

// compare and isBuffer taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
function compare(a, b) {
  if (a === b) {
    return 0;
  }

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }

  if (x < y) {
    return -1;
  }
  if (y < x) {
    return 1;
  }
  return 0;
}
function isBuffer(b) {
  if (global.Buffer && typeof global.Buffer.isBuffer === 'function') {
    return global.Buffer.isBuffer(b);
  }
  return !!(b != null && b._isBuffer);
}

// based on node assert, original notice:

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util/');
var hasOwn = Object.prototype.hasOwnProperty;
var pSlice = Array.prototype.slice;
var functionsHaveNames = (function () {
  return function foo() {}.name === 'foo';
}());
function pToString (obj) {
  return Object.prototype.toString.call(obj);
}
function isView(arrbuf) {
  if (isBuffer(arrbuf)) {
    return false;
  }
  if (typeof global.ArrayBuffer !== 'function') {
    return false;
  }
  if (typeof ArrayBuffer.isView === 'function') {
    return ArrayBuffer.isView(arrbuf);
  }
  if (!arrbuf) {
    return false;
  }
  if (arrbuf instanceof DataView) {
    return true;
  }
  if (arrbuf.buffer && arrbuf.buffer instanceof ArrayBuffer) {
    return true;
  }
  return false;
}
// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

var regex = /\s*function\s+([^\(\s]*)\s*/;
// based on https://github.com/ljharb/function.prototype.name/blob/adeeeec8bfcc6068b187d7d9fb3d5bb1d3a30899/implementation.js
function getName(func) {
  if (!util.isFunction(func)) {
    return;
  }
  if (functionsHaveNames) {
    return func.name;
  }
  var str = func.toString();
  var match = str.match(regex);
  return match && match[1];
}
assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  } else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = getName(stackStartFunction);
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function truncate(s, n) {
  if (typeof s === 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}
function inspect(something) {
  if (functionsHaveNames || !util.isFunction(something)) {
    return util.inspect(something);
  }
  var rawname = getName(something);
  var name = rawname ? ': ' + rawname : '';
  return '[Function' +  name + ']';
}
function getMessage(self) {
  return truncate(inspect(self.actual), 128) + ' ' +
         self.operator + ' ' +
         truncate(inspect(self.expected), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'deepStrictEqual', assert.deepStrictEqual);
  }
};

function _deepEqual(actual, expected, strict, memos) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;
  } else if (isBuffer(actual) && isBuffer(expected)) {
    return compare(actual, expected) === 0;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if ((actual === null || typeof actual !== 'object') &&
             (expected === null || typeof expected !== 'object')) {
    return strict ? actual === expected : actual == expected;

  // If both values are instances of typed arrays, wrap their underlying
  // ArrayBuffers in a Buffer each to increase performance
  // This optimization requires the arrays to have the same type as checked by
  // Object.prototype.toString (aka pToString). Never perform binary
  // comparisons for Float*Arrays, though, since e.g. +0 === -0 but their
  // bit patterns are not identical.
  } else if (isView(actual) && isView(expected) &&
             pToString(actual) === pToString(expected) &&
             !(actual instanceof Float32Array ||
               actual instanceof Float64Array)) {
    return compare(new Uint8Array(actual.buffer),
                   new Uint8Array(expected.buffer)) === 0;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else if (isBuffer(actual) !== isBuffer(expected)) {
    return false;
  } else {
    memos = memos || {actual: [], expected: []};

    var actualIndex = memos.actual.indexOf(actual);
    if (actualIndex !== -1) {
      if (actualIndex === memos.expected.indexOf(expected)) {
        return true;
      }
    }

    memos.actual.push(actual);
    memos.expected.push(expected);

    return objEquiv(actual, expected, strict, memos);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b, strict, actualVisitedObjects) {
  if (a === null || a === undefined || b === null || b === undefined)
    return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b))
    return a === b;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b))
    return false;
  var aIsArgs = isArguments(a);
  var bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b, strict);
  }
  var ka = objectKeys(a);
  var kb = objectKeys(b);
  var key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length !== kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key], strict, actualVisitedObjects))
      return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

assert.notDeepStrictEqual = notDeepStrictEqual;
function notDeepStrictEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'notDeepStrictEqual', notDeepStrictEqual);
  }
}


// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  }

  try {
    if (actual instanceof expected) {
      return true;
    }
  } catch (e) {
    // Ignore.  The instanceof check doesn't work for arrow functions.
  }

  if (Error.isPrototypeOf(expected)) {
    return false;
  }

  return expected.call({}, actual) === true;
}

function _tryBlock(block) {
  var error;
  try {
    block();
  } catch (e) {
    error = e;
  }
  return error;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof block !== 'function') {
    throw new TypeError('"block" argument must be a function');
  }

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  actual = _tryBlock(block);

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  var userProvidedMessage = typeof message === 'string';
  var isUnwantedException = !shouldThrow && util.isError(actual);
  var isUnexpectedException = !shouldThrow && actual && !expected;

  if ((isUnwantedException &&
      userProvidedMessage &&
      expectedException(actual, expected)) ||
      isUnexpectedException) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws(true, block, error, message);
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws(false, block, error, message);
};

assert.ifError = function(err) { if (err) throw err; };

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"util/":5}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],5:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":4,"_process":2,"inherits":3}],6:[function(require,module,exports){

"use strict";

function sigmoid(x) {
    return 1.0 / (1.0 + Math.exp(-x));
}

function tanh(x) {
    return Math.tanh(x);
}

function relu(x) {
    return (x <= 0) ? 0 : x;
}

function softplus(x) {
    return Math.log(1 + Math.exp(x));
}

const FUNCTIONS = [sigmoid, tanh, relu, softplus];
const ByName = {};
(function () {
    function carpenters_derivative(f, delta = 0.00001) {
        return function (x) {
            return (f(x + delta) - f(x)) / delta;
        };
    }

    for (let f of FUNCTIONS) {
        f.df = carpenters_derivative(f);
        ByName[f.name] = f;
    }
    Object.freeze(ByName);
})();

module.exports = ByName;

},{}],7:[function(require,module,exports){

"use strict";

const mod = {
    helpers: require('./helpers'),
    mersenne: require('./mersenne'),
    randgen: require('./randgen'),
    activation: require('./activation'),
    genes: require('./genes'),
    network: require('./network'),
    genome: require('./genome'),
    simulation: require('./simulation')
};

const {Simulation} = mod.simulation;

const ex = {};
ex.makeTrivialSimulation = function () {
    // Make a simulation for a network with two inputs and two outputs.
    const numInputs = 2,
          numOutputs = 2;
    const sim = new Simulation({numInputs, numOutputs});
    return sim;
}

window.$G = {
    mod, ex,
    modules: mod,
    examples: ex,
};

},{"./activation":6,"./genes":8,"./genome":9,"./helpers":10,"./mersenne":11,"./network":12,"./randgen":13,"./simulation":14}],8:[function(require,module,exports){

"use strict";

const assert = require('assert');
const {forEachArray} = require("./helpers");
const activation = require("./activation");

// A Gene is component of a linked list sequence of genes, which forms
// a genome.  This sequence of genes, evaluated from tail to head,
// specifies a neural network toplogy, although not its weights.
//
// Every gene carries a lineage id which identifies its conception history.
//
// However, the topology specification can be expanded into a graph
// structure at runtime, which can be paired with a typed array of floats
// for the network's weights.
//
// All genomes are implicitly prefixed with a series of InputNode and
// OutputNode genes which are fixed and never change.  These are given
// initial lineageIds numbered from 1.

const GENE_KINDS = [
    "InputNode",
    "OutputNode",
    "HiddenNode",
    "NodeEdge",
    "GateEdge",
    "DisableEdge",
    "DisableNode"
];
(function () {
    GENE_KINDS.forEach(name => {
        GENE_KINDS[name] = name;
    });
})();
Object.freeze(GENE_KINDS);

class Gene {
    constructor(lineageId, generation) {
        this.lineageId = lineageId;
        this.generation = generation;
    }

    get kind() { return this.constructor.geneKind; }

    static genReprString(...params) {
        const accum = [this.geneKind];
        for (let param of params) {
            accum.push(":" + param);
        }
        const result = accum.join("");
        console.log("genReprString RETURNING: ", {xx:this, accum, result});
        return result;
    }

    // reprString()
}
Gene.Kinds = GENE_KINDS;


// A GeneDescriptor associates a specific gene with
// information tying it to a structural graph representation
// as opposed to the log representation of a sequence of lists.
//
// Every gene defines its own descriptor.  All descriptors have
// a few base properties: the gene they describe, and the
// number of values they use from the network weights (biases can
// be viewed as weights on edges from a constant input), the
// number of values they write to execution-time network state,
// and the number of diagnostic values they produce per evaluation.
//
// Specific gene descriptors may hold other informaton.  Descriptors
// for nodes hold lists of input and output edges.
class GeneDescriptor {
    constructor(gene) {
        this.gene = gene;

        // The following are expected to be initialized in
        // descendant constructors.
        this.numWeightVars = 0;
        this.numStateVars = 0;
        this.numTraceVars = 0;

        // This will be set in the genome constructor in INIT_DISABLED.
        this.disabled = false;

        // This is initialized in the Genome constructor in INIT_ORDERING.
        this.stageNo = -1;

        // The following will be initialized in the Genome constructor
        // init INIT_OFFSETS.
        this.weightOffset = -1;
        this.stateOffset = -1;
        this.traceOffset = -1;
    }

    geneKind() { return this.gene.kind; }

    setWeightOffset(offset) {
        assert(Number.isInteger(offset) && offset >= 0)
        assert(this.weightOffset == -1);
        this.weightOffset = offset;
    }
    setStateOffset(offset) {
        assert(Number.isInteger(offset) && offset >= 0)
        assert(this.stateOffset == -1)
        this.stateOffset = offset;
    }
    setTraceOffset(offset) {
        assert(Number.isInteger(offset) && offset >= 0)
        assert(this.traceOffset == -1)
        this.traceOffset = offset;
    }
    setDisabledBy(descr) {
        this.disabled = descr;
    }
    setStageNo(stageNo) {
        assert(stageNo >= 0)
        assert(this.stageNo == -1)
        this.stageNo = stageNo;
    }

    registerEdges(/*genome*/) {}
}

// An InputNodeGene is an implicit gene that idenifies an
// input node.  It doesn't explicitly exist on the genome's
// chain of genes, but is created at runtime when manipulating
// networks.
class InputNodeGene extends Gene {
    constructor(lineageId, generation, inputNo) {
        super(lineageId, generation);
        this.inputNo = inputNo;
        return Object.freeze(this);
    }

    static reprString(inputNo) {
        return this.genReprString(inputNo);
    }
    reprString() {
        return InputNodeGene.reprString(this.inputNo);
    }

    descriptor() { return new InputNodeDescriptor(this); }
}
InputNodeGene.geneKind = GENE_KINDS.InputNode;

class InputNodeDescriptor extends GeneDescriptor {
    constructor(gene) {
        // ASSERT: gene instanceof InputNodeGene
        super(gene);
        this.numStateVars = 1;

        // Filled in the Genome constructor during INIT_GRAPH
        this.outputEdges = [];

        // Filled in the Genome constructor during INIT_DISABLED
        this.numDisabledOutputs = 0;
    }

    addOutputEdge(edge) { this.outputEdges.push(edge); }
    numOutputEdges() { return this.outputEdges.length; }
    forEachOutputEdge(cb) {
        return forEachArray(this.outputEdges, cb);
    }
    numLiveOutputs() {
        return this.outputEdges.length - this.numDisabledOutputs;
    }
}

// A LinearGene is just base support for both hidden and output
// node genes, which both need to maintain input edge lists, a bias,
// as well as identify an activation function.
class LinearGene extends Gene {
    constructor(lineageId, generation, actfName) {
        super(lineageId, generation);
        this.actfName = actfName;
    }
}

class LinearDescriptor extends GeneDescriptor {
    constructor(gene) {
        // ASSERT: gene instanceof LinearGene
        super(gene);
        this.actf = activation[gene.actfName];
        this.numWeightVars = 1; // One var for bias.
        this.numStateVars = 1;

        // Filled in the Genome constructor during INIT_GRAPH
        this.inputEdges = [];

        // Filled in the Genome constructor during INIT_DISABLED
        this.numDisabledInputs = 0;
    }

    addInputEdge(edge) { this.inputEdges.push(edge); }
    numInputEdges() { return this.inputEdges.length; }
    forEachInputEdge(cb) {
        return forEachArray(this.inputEdges, cb);
    }
    numLiveInputs() {
        return this.inputEdges.length - this.numDisabledInputs;
    }
}

// Output node genes are implicit genes that identify output
// nodes.  They are not described in the genome sequence, but
// are created at runtime to help manipulate networks.
class OutputNodeGene extends LinearGene {
    constructor(lineageId, generation, actfName, outputNo) {
        super(lineageId, generation, actfName);
        this.outputNo = outputNo;
        return Object.freeze(this);
    }

    static reprString(actfName, outputNo) {
        return this.genReprString(actfName, outputNo);
    }
    reprString() {
        return OutputNodeGene.reprString(this.actfName, this.outputNo);
    }

    descriptor() { return new OutputNodeDescriptor(this); }
}
OutputNodeGene.geneKind = GENE_KINDS.OutputNode;

class OutputNodeDescriptor extends LinearDescriptor {
    constructor(gene) {
        // ASSERT: gene instanceof OutputNodeGene
        super(gene);
    }
}

// Hidden node genes are explicit genes that identify hidden
// nodes.  They appear in the genome sequence and are associated
// with a sequence of input edges, and a sequence of output edges.
class HiddenNodeGene extends LinearGene {
    constructor(lineageId, generation, actfName, tag) {
        super(lineageId, generation, actfName);
        this.tag = tag;
        return Object.freeze(this);
    }

    static reprString(actfName, tag) {
        return this.genReprString(actfName, tag);
    }
    reprString() {
        return HiddenNodeGene.reprString(this.actfName, this.tag);
    }

    descriptor() { return new HiddenNodeDescriptor(this); }
}
HiddenNodeGene.geneKind = GENE_KINDS.HiddenNode;

class HiddenNodeDescriptor extends LinearDescriptor {
    constructor(gene) {
        // ASSERT: gene instanceof HiddenNodeGene
        super(gene);

        // Filled in the Genome constructor during INIT_GRAPH
        this.outputEdges = [];

        // Filled in the Genome constructor during INIT_DISABLED
        this.numDisabledOutputs = 0;
    }

    addOutputEdge(edge) { this.outputEdges.push(edge); }
    numOutputEdges() { return this.outputEdges.length; }
    forEachOutputEdge(cb) {
        return forEachArray(this.outputEdges, cb);
    }
    numLiveOutputs() {
        return this.outputEdges.length - this.numDisabledOutputs;
    }
}

// Node edge genes identify edges between nodes.  They specifically
// identify feed-forward edges where the fromNode is guaranteed to
// have an activation phase that occurs before the toNode's activation
// phase.
class NodeEdgeGene extends Gene {
    constructor(lineageId, generation, fromNodeId, toNodeId) {
        super(lineageId, generation);
        this.fromNodeId = fromNodeId;
        this.toNodeId = toNodeId;
        return Object.freeze(this);
    }
    static reprString(fromNodeId, toNodeId) {
        return this.genReprString(fromNodeId, toNodeId);
    }
    reprString() {
        return NodeEdgeGene.reprString(this.fromNodeId, this.toNodeId);
    }

    descriptor() { return new NodeEdgeDescriptor(this); }
}
NodeEdgeGene.geneKind = GENE_KINDS.NodeEdge;

class NodeEdgeDescriptor extends GeneDescriptor {
    constructor(gene) {
        // ASSERT: gene instanceof NodeEdgeGene
        super(gene);
        this.numWeightVars = 1; // One var for weight.

        // Filled in the Genome constructor during INIT_GRAPH
        this.fromNode = null;
        this.toNode = null;
        this.gateEdges = [];

        // Filled in the Genome constructor during INIT_DISABLED
        this.numDisabledGates = 0;
    }

    addGateEdge(edge) { this.gateEdges.push(edge); }
    numGateEdges() { return this.gateEdges.length; }
    forEachGateEdge(cb) {
        return forEachArray(this.gatedEdges, cb);
    }
    numLiveGates() {
        return this.gateEdges.length - this.numDisabledGates;
    }

    registerEdges(genome) {
        // Find the from and to nodes.
        this.fromNode = genome.getDescriptor(this.gene.fromNodeId);
        this.toNode = genome.getDescriptor(this.gene.toNodeId);

        this.fromNode.addOutputEdge(this);
        this.toNode.addInputEdge(this);
    }
}

// Gate edge genes identify edges that gate other edges.  Gate
// edges adjust the weight of other edges at runtime.
// Gate edges can't themselves be gated... not really useful since
// it's equivalent to gating the target edge in the first place.
class GateEdgeGene extends Gene {
    constructor(lineageId, generation, fromNodeId, targetEdgeId) {
        super(lineageId, generation);
        this.fromNodeId = fromNodeId;
        this.targetEdgeId = targetEdgeId;
        return Object.freeze(this);
    }

    static reprString(fromNodeId, targetEdgeId) {
        return this.genReprString(fromNodeId, targetEdgeId);
    }
    reprString() {
        return GateEdgeGene.reprString(this.fromNodeId, this.targetEdgeId);
    }

    descriptor() { return new GateEdgeDescriptor(this); }
}
GateEdgeGene.geneKind = GENE_KINDS.GateEdge;

class GateEdgeDescriptor extends GeneDescriptor {
    constructor(gene) {
        // ASSERT: gene instanceof GateEdgeGene
        super(gene);
        this.numWeightVars = 1; // One var for weight.

        // Filled in the Genome constructor during INIT_GRAPH
        this.fromNode = null;
        this.targetEdge = null;
    }

    registerEdges(genome) {
        // Find the from and to nodes.
        this.fromNode = genome.getDescriptor(this.gene.fromNodeId);
        this.targetEdge = genome.getDescriptor(this.gene.targetEdgeId);

        this.fromNode.addOutputEdge(this);
        this.targetEdge.addGateEdge(this);
    }
}

// Disable edge genes effectively removing existing edges.
// They don't have any data associated with them, but just
// note when an edge has been disabled.
class DisableEdgeGene extends Gene {
    constructor(lineageId, generation, disabledEdgeId) {
        super(lineageId, generation);
        this.disabledEdgeId = disabledEdgeId;
        return Object.freeze(this);
    }

    static reprString(disabledEdgeId) {
        return this.genReprString(disabledEdgeId);
    }
    reprString() {
        return DisableEdgeGene.reprString(this.disabledEdgeId);
    }

    descriptor() { return new DisableEdgeDescriptor(this); }
}
DisableEdgeGene.geneKind = GENE_KINDS.DisableEdge;

class DisableEdgeDescriptor extends GeneDescriptor {
    constructor(gene) {
        // ASSERT: gene instanceof GateEdgeGene
        super(gene);

        // Filled in the Genome constructor during INIT_GRAPH
        this.disabledEdge = null;
    }

    registerWithGenome(genome) {
        // Find the disabled edge and mark it disabled.
        this.disabledEdge = genome.getDescriptor(this.gene.disabledEdgeId);
        this.disabledEdge.setDisabledBy(this);
    }
}

// Disable node genes effectively removing existing nodes.
// They don't have any data associated with them, but just
// note when node has been disabled.
class DisableNodeGene extends Gene {
    constructor(lineageId, generation, disabledNodeId) {
        super(lineageId, generation);
        this.disabledNodeId = disabledNodeId;
        return Object.freeze(this);
    }

    static reprString(disabledNodeId) {
        return this.genReprString(disabledNodeId);
    }
    reprString() {
        return DisableNodeGene.reprString(this.disabledNodeId);
    }

    descriptor() { return new DisableNodeDescriptor(this); }
}
DisableNodeGene.geneKind = GENE_KINDS.DisableNode;

class DisableNodeDescriptor extends GeneDescriptor {
    constructor(gene) {
        // ASSERT: gene instanceof GateNodeGene
        super(gene);

        // Filled in the Genome constructor during INIT_GRAPH
        this.disabledNode = null;
    }

    registerWithGenome(genome) {
        // Find the disabled node and mark it disabled.
        this.disabledNode = genome.getDescriptor(this.genome.disabledNodeId);
        this.disabledNode.setDisabledBy(this);
    }
}


module.exports = {Gene};
(function () {
    [
        InputNodeGene,
        LinearGene,
        OutputNodeGene,
        HiddenNodeGene,
        NodeEdgeGene,
        GateEdgeGene,
        DisableEdgeGene,
        DisableNodeGene
    ].forEach(cls => {
        const geneName = cls.name.substr(0, cls.name.length - 4);
        // ASSERT: GENE_NAMES[geneName] == geneName
        Gene[geneName] = cls;
        module.exports[cls.name] = cls;
    });
})();

},{"./activation":6,"./helpers":10,"assert":1}],9:[function(require,module,exports){

"use strict";

const assert = require("assert");
const {forEachArray} = require("./helpers");
const {Gene} = require("./genes");
const {Network} = require("./network");

// A genome is characterized by a list of Genes that specify the
// structure of a neural network.  Multiple genomes may share a
// gene in their lists.
//
// The gene list is ordered by lineageId, which imposes an ordering
// on the evaluation of genes when construting a network from them.
//
// A Genome instance constructs and keeps a graph representation of
// the network specified by the gene list.  It does this in the
// following stages:
//
//  1. INIT_MAP
//     Construct a map from Gene lineageIds to GeneDescriptor
//     instances for each gene. Every GeneDescriptor is owned
//     by a Genome, rather than shared across Genomes.  This map
//     of GeneDescriptors, and references between them, are used
//     to represent the network structure.  In the beginning,
//     however, the descriptor annotations are empty.
//     See `Gene#descriptor` and overrides.
//
//  2. INIT_GRAPH
//     Register every edge Gene as the output edge for its fromNode
//     Gene, and as the input edge for its toNode Gene (or as the
//     gate edge for its targetEdge Gene, if the edge is a GateEdge).
//     This establishes a basic traversable graph structure on
//     top of the GeneDescriptor map.
//     See `Gene#registerEdges` and overrides.
//
//  3. INIT_DISABLED
//     Traverse all DisableNode and DisableEdge genes and mark
//     them as disabled, propagating the disabled status to
//     any required adjacent edges or nodes.
//
//  4. INIT_ORDERING
//     Order all nodes and edges in stages by activation order,
//     assigning a stageNo to each node and edge gene.
//
//  5. INIT_OFFSETS
//     Walk all nodes and edges in order, assigning offsets for
//     weight, state, and trace vars for each gene.
//  

class Genome {
    constructor(genomeId, simulation, geneList) {
        this.genomeId = genomeId;
        this.simulation = simulation;
        this.geneList = geneList;
        this.descrList = [];

        // This constructor initializes all the tracking
        // structures required for a genome.

        //
        // INIT_MAP
        //

        // This is a map from lineageIds to gene descriptors which
        // map genes in GeneList onto actual networks.
        this.descrMap = new Map();

        // Fill the descriptor map with the gene descriptors.
        this.forEachGene(gene => {
            const descr = gene.descriptor();
            this.descrList.push(descr);
            this.descrMap.set(gene.lineageId, descr);
        });

        //
        // INIT_GRAPH
        //

        // Register all edges with the genome, so that we can
        // traverse the descrMap as a graph.
        this.forEachDescriptor(descr => descr.registerEdges(this));

        //
        // INIT_DISABLED
        //

        // Use the disabler to propagate disabled edge genes
        // effects across the network.
        const disabler = new Disabler(this);
        this.forEachDescriptor(descr => {
            disabler.handleIfDisablerGene(descr);
        });

        // At this point, all execution-useless node and edge genes
        // have been marked disabled, implicit and explicit.

        //
        // INIT_ORDERING
        //

        // Create an ordering of all nodes and edges by activation order.
        const actOrder = new Ordering(this);
        // Save the list of nodes and edges at every order number.
        this.nodeEdgeStages = actOrder.getStages();

        //
        // INIT_OFFSETS
        //

        // Now calculate location offsets for each gene (i.e. the
        // weight offset in the weights table for a given edge,
        // the store offset in the execution table for a node's
        // activation on a given execution).
        let weightOffset = 0;
        let stateOffset = 0;
        let traceOffset = 0;
        this.forEachNodeAndEdgeByStage(descr => {
            if (descr.numWeightVars > 0) {
                descr.setWeightOffset(weightOffset);
                weightOffset += descr.numWeightVars;
            }

            if (descr.numStateVars > 0) {
                descr.setStateOffset(stateOffset);
                stateOffset += descr.numStateVars;
            }

            if (descr.numTraceVars > 0) {
                descr.setTraceOffset(traceOffset);
                traceOffset += descr.numTraceVars;
            }
        });

        this.numWeights = weightOffset;
        this.numStates = stateOffset;
        this.numTraces = traceOffset;

        // Phew! All done. TODO: Freeze everything!
        Object.freeze(this);
    }

    forEachGene(cb) {
        if (this.simulation.forEachInputNodeGene(cb) === false) {
            return false;
        }
        if (this.simulation.forEachOutputNodeGene(cb) === false) {
            return false;
        }
        if (this.simulation.forEachStartingEdgeGene(cb) === false) {
            return false;
        }
        return forEachArray(this.geneList, cb);
    }
    forEachInputDescriptor(cb) {
        const descrList = this.descrList;
        const numInputs = this.simulation.numInputs;
        let r;
        for (let i = 0; i < numInputs; i++) {
            // ASSERT: descrList[i].geneKinds() == Gene.Kinds.InputNode
            r = cb(descrList[i], i);
            if (r === false) { return false; }
        }
        return r;
    }
    forEachOutputDescriptor(cb) {
        const numInputs = this.simulation.numInputs;
        const numFixed = this.simulation.numFixed;
        let r;
        for (let i = numInputs; i < numFixed; i++) {
            // ASSERT: descrList[i].geneKinds() == Gene.Kinds.OutputNode
            r = cb(this.descrList[i], i);
            if (r === false) { return false; }
        }
        return r;
    }
    forEachDescriptor(cb) {
        return forEachArray(this.descrList, cb);
    }

    // Get the descriptor for a gene by lineage id.
    getDescriptor(lineageId) {
        return this.descrMap.get(lineageId);
    }

    // Get an ordered list of nodes such that the following holds:
    //  * An iteration from start to finish visits each node N such
    //    that all nodes producing feed-forward input to N to are
    //    already visited.
    forEachNodeAndEdgeByStage(cb) {
        const nstages = this.nodeEdgeStages.length;
        let r;
        for (let s = 0; s < nstages; s++) {
            const stageNodes = this.nodeEdgeStages[s].nodes;
            const stageEdges = this.nodeEdgeStages[s].edges;
            for (let i = 0; i < stageNodes.length; i++) {
                r = cb(stageNodes[i], s, i);
                if (r === false) { return false; }
            }
            for (let i = 0; i < stageEdges.length; i++) {
                r = cb(stageEdges[i], s, i);
                if (r === false) { return false; }
            }
        }
        return r;
    }
    forEachNodeByStage(cb, startAt=0) {
        assert(Number.isInteger(startAt));
        assert(startAt >= 0 && startAt < this.nodeEdgeStages.length);
        const nstages = this.nodeEdgeStages.length;
        let r;
        for (let s = startAt; s < nstages; s++) {
            const stageNodes = this.nodeEdgeStages[s].nodes;
            for (let i = 0; i < stageNodes.length; i++) {
                r = cb(stageNodes[i], s, i);
                if (r === false) { return false; }
            }
        }
        return r;
    }
    forEachNodeByStageSkipFirst(cb) {
        return this.forEachNodeByStage(cb, /* startAt = */ 1);
    }

    // Create a new network with this genome, empty weights.
    createNetwork() {
        return new Network(this, new Float32Array(this.numWeights));
    }
    createState() {
        return new Float32Array(this.numStates);
    }
    createTrace() {
        return new Float32Array(this.numTraces);
    }
}

// We use a class to track disabled gene propagation.  For all
// DisableNode and DisableEdge genes, apply them in order, keeping
// track of any consequent disabled genes (edges or nodes).
//
// If a node is disabled, then all of its input edges and output
// edges are also disabled.  If an edge is disabled, then we increment
// a count of dead outgoing/incoming edges on the from/to nodes, and
// also disable any edges gating that edge.
//
// If a node's dead inputs or outputs are incremented until they are
// equal to its actual input and output count, then the node is disabled.
//
// Note that dead gate edges don't affect their target edges because
// whether the target edge is activated is not influenced by the gate edge.
class Disabler {
    constructor(genome) {
        this.genome = genome;
    }

    incrDeadInputs(node) {
        // ASSERT: node.numDisabledInputs < node.numInputEdges()
        if (++node.numDisabledInputs >= node.numInputEdges()) {
            return node;
        }
        return false;
    }
    incrDeadOutputs(node) {
        // ASSERT: node.numDisabledOutputs < node.numOutputEdges()
        if (++node.numDisabledOutputs >= node.numOutputEdges()) {
            return node;
        }
        return false;
    }
    incrDeadGates(edge) {
        // ASSERT: node.numDisabledGates < node.numGateEdges()
        if (++edge.numDisabledGates >= edge.numGateEdges()) {
            return edge;
        }
        return false;
    }

    handleIfDisablerGene(descr) {
        if (descr.geneKind() === Gene.Kinds.DisableEdge) {
            this.disableEdge(descr.disabledEdge);
        } else if (descr.geneKind() === Gene.Kinds.DisableNode) {
            this.disableNode(descr.disabledNode);
        }
    }

    disableNode(descr) {
        // ASSERT: descr.geneKind() in [Gene.Kinds.InputNode,
        //                              Gene.Kinds.OutputNode,
        //                              Gene.Kinds.HiddenNode]
        if (descr.disabled) {
            return;
        }
        descr.setDisabled(true);

        const hasIn = (descr.geneKind() !== Gene.Kinds.InputNode);
        const hasOut = (descr.geneKind() !== Gene.Kinds.OutputNode);
        if (hasIn) {
            descr.forEachInputEdge(edge => this.disableEdge(edge));
        }
        if (hasOut) {
            descr.forEachOutputEdge(edge => this.disableEdge(edge));
        }
    }

    disableEdge(descr) {
        // ASSERT: descr.geneKind() in [Gene.Kinds.NodeEdge,
        //                              Gene.Kinds.GateEdge]
        if (descr.disabled) {
            return;
        }
        descr.setDisabled(true);

        // Increment the dead output count on the fromNode, disabling
        // the node if all outputs are dead.
        const deadFromNode = this.incrDeadOutputs(descr.fromNode);
        if (deadFromNode) {
            this.disableNode(deadFromNode);
        }

        // If the disabled edge is a NodeEdge, increment the dead
        // input count on the toNode, disabling the node if all inputs
        // are dead.
        if (descr.geneKind() === Gene.Kinds.NodeEdge) {
            // Disable all edges gating this one.
            descr.forEachGateEdge(edge => this.disableEdge(edge));

            const deadToNode = this.incrDeadInputs(descr.toNode);
            if (deadToNode) {
                this.disableNode(deadToNode);
            }
        }

        // The targetEdge stays active when a GateEdge is disabled, but
        // we do increment the dead gate count.
        if (descr.geneKind() === Gene.Kinds.NodeEdge) {
            this.incrDeadGates(descr.targetEdge);
        }
    }
}

// A genome ordering is an array of array, where each inner array contains
// node or edge ids which are activated at that stage.
class Ordering {
    constructor(genome) {
        this.genome = genome;
        this.seen = new Set();
        this.ffMap = new Map();

        this.stages = [{nodes:[], edges:[]}];
        this.currentSet = this.stages[0];
        this.stageNo = 0;

        const inputSet = this.currentSet;

        // Initialize the first stage to be all the input
        // nodes, except those which are disabled.
        this.genome.forEachInputDescriptor(descr => {
            // ASSERT: descr.geneKind() == Gene.Kinds.InputNode
            if (!descr.disabled) {
                inputSet.nodes.push(descr);
                this.seen.add(descr);
            }
        });
        // Loop until done.
        for (;;) {
            // Compute the next set of activated nodes.
            const nextNodes = this.fillEdges();
            if (nextNodes.length == 0) {
                // No more nodes have been activated after fulfilling
                // edges from current activation stage.
                break;
            }
            const nextAbleNodes = nextNodes.filter(node => !node.disabled);
            const nextSet = {nodes:nextAbleNodes, edges:[]};

            // Increment the stage no.
            this.stages.push(nextSet);
            this.currentSet = nextSet;
            this.stageNo++;
        }

        // Now all nodes and edges are ordered, and have their stageNo
        // set appropriately.
    }

    getStages() {
        return this.stages.map(stage => { return { nodes: stage.nodes, edges: stage.edges }; });
    }

    getNodesByStage() {
        return this.stages.map(stage => stage.nodes);
    }

    getFf(descr) {
        return this.ffMap.get(descr) || 0;
    }
    incrFf(descr, propName) {
        const required = descr[propName]();
        const ff = this.getFf(descr) + 1;
        this.ffMap.set(descr, ff);
        if (ff >= required) {
            return descr;
        }
        return false;
    }

    fillEdges() {
        const nextNodes = [];
        const stageNo = this.stageNo;
        for (let node of this.currentSet.nodes) {
            node.setStageNo(stageNo);
            // If it's an InputNode or HiddenNode, add all the outgoing
            // edges.
            switch (node.geneKind()) {
            case Gene.Kinds.InputNode:
            case Gene.Kinds.HiddenNode:
                node.forEachOutputEdge(edge => {
                    // ASSERT: !this.seen.has(edge);
                    this.addEdge(edge, nextNodes);
                });
            }
        }
        return nextNodes;
    }

    addEdge(descr, nextNodesOut) {
        // ASSERT: !this.seen.has(descr);
        this.seen.add(descr);
        this.currentSet.edges.push(descr);
        descr.setStageNo(this.stageNo);
        if (descr.geneKind() === Gene.Kinds.NodeEdge) {
            // If a node edge is activated, increment the ffmap
            // for the to node id.
            const ffNode = this.incrFf(descr.toNode, "numLiveInputs");
            if (ffNode) {
                // ASSERT: !this.seen.has(ffNode);
                nextNodesOut.push(ffNode);
            }
        } else if (descr.geneKind() === Gene.Kinds.GateEdge) {
            // If a gated edge is activated, increment the ffmap
            // for the target edge id.
            const ffEdge = this.incrFf(descr.targetEdge, "numLiveGates");
            if (ffEdge) {
                // ASSERT: !this.seen.has(ffEdge);
                this.addEdge(ffEdge, nextNodesOut);
            }
        }
    }
}

module.exports = { Genome };

},{"./genes":8,"./helpers":10,"./network":12,"assert":1}],10:[function(require,module,exports){

"use strict";

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
    gaussianBoxMuller
};

},{}],11:[function(require,module,exports){

"use strict";

const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;
const MAG01 = new Uint32Array([0x0, this.MATRIX_A]);

// Types:
//      Type.Number, Type.Integer

class MersenneTwister {
    constructor(seed) {
        // ASSERT: Number.isInteger(seed) && seed >= 0
        this.seed = seed;
        this.mt = new Uint32Array(N);
        this.mti = N;
        this.ticks = 0;

        this.initSeed(seed);
    }

    initSeed(seed) {
        // ASSERT: Number.isInteger(s) && s >= 0
        this.mt[0] = seed >>> 0;
        for (let i = 1; i < N; i++) {
            const s = this.mt[i - 1] ^ (this.mt[i-1] >>> 30);
            this.mt[i] = ((((s >>> 16) * 1812433253) << 16) +
                          ((s & 0xffff) * 1812433253)) + i;
        }
        this.mti = N;
    }

    extractState() {
        return {
            seed: seed,
            mt: Array.prototype.slice.call(this.mt),
            mti: this.mti,
            ticks: this.ticks
        };
    }
    injectState(state) {
        // ASSERT: Number.isInteger(state.seed)
        // ASSERT: state.mt instanceof Array && state.mt.length == N
        // ASSERT: Number.isInteger(state.mti) && state.mti <= N
        // ASSERT: Number.isInteger(state.ticks) && state.ticks >= 0
        this.seed = state.seed;
        this.mt = new Uint32Array(state.mt);
        this.mti = state.mti;
        this.ticks = state.ticks
    }

    randomInt() {
        // ASSERT: this.mti <= N
        if (this.mti == N) {
            this.generateStep();
            // ASSERT: this.mti == 0
        }
        // ASSERT: this.mti < N
        const y = this.mt[this.mti++];
        y ^= (y >>> 11);
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= (y >>> 18);
        this.ticks++;
        return y;
    }

    random() {
        return this.randomInt() / ((-1>>>0)+1);
    }

    generateStep() {
        // ASSERT: this.mti == N
        let kk;
        for (kk = 0; kk < N-M; kk++) {
            const y = this.generateY(kk, kk+1);
            this.mt[kk] = this.mt[kk + M] ^ (y >>> 1) ^ MAG01[y & 0x1];
        }
        for (; kk < this.N - 1; kk++) {
            const y = this.generateY(kk, kk+1);
            this.mt[kk] = this.mt[kk + (M - N)] ^ (y >>> 1) ^ MAG01[y & 0x1];
        }
        const y = this.generateY(N-1, 0);
        this.mt[N - 1] = this.mt[M - 1] ^ (y >>> 1) ^ MAG01[y & 0x1];
        this.mti = 0;
    }
    generateY(kk, kkn) {
        return (this.mt[kk] & UPPER_MASK)|(this.mt[kkn] & LOWER_MASK);
    }
}

},{}],12:[function(require,module,exports){

"use strict";

// A network represents a single instance of a neural network, by
// referring to a genome and an array of weight values referenced
// by the genome.

class Network {
    constructor(genome, weights) {
        this.genome = genome;
        this.weights = weights;
    }

    readWeight(descr) {
        // ASSERT: descr.weightOffset >= 0
        // ASSERT: descr.numWeights == 1
        return this.weights[descr.weightOffset];
    }
}

class Runner {
    constructor(network, states, traces) {
        this.network = network;
        this.genome = network.genome;
        this.states = states;
        this.traces = traces;
    }

    readState(descr) {
        // ASSERT: descr.stateOffset >= 0
        // ASSERT: descr.numStates == 1
        return this.states[descr.stateOffset];
    }
    writeState(descr, state) {
        // ASSERT: descr.stateOffset >= 0
        // ASSERT: descr.numStates == 1
        this.states[descr.stateOffset] = state;
    }

    readTrace(descr) {
        // ASSERT: descr.traceOffset >= 0
        // ASSERT: descr.numTraces == 1
        return this.traces[descr.traceOffset];
    }
    writeTrace(descr, trace) {
        // ASSERT: descr.traceOffset >= 0
        // ASSERT: descr.numTraces == 1
        this.traces[descr.traceOffset] = trace;
    }

    run(inputs) {
        // Write the inputs to the state array.
        this.genome.forEachInputDescriptor(descr => {
            this.writeState(descr, inputs[descr.gene.inputNo]);
        });

        // Now evaluate all node stages except first (input)
        this.genome.forEachNodeByStageSkipFirst(node => {
            let sum = 0;
            node.forEachInputEdge(edge => {
                const W = this.network.readWeight(edge);
                const x = this.readState(edge.fromNode);
                sum += W*x;
            });
            const b = this.network.readWeight(node);
            sum += b;
            const actv = node.actf(sum);
            this.writeState(node, actv);
        });
        // Read out outputs and return.
        const numOutputs = this.genome.simulation.numOutputs;
        const outputs = new Float32Array(numOutputs);
        this.genome.forEachOutputDescriptor(descr => {
            outputs[descr.gene.outputNo] = this.readState(descr);
        });
        return outputs;
    }
}

module.exports = { Network, Runner };

},{}],13:[function(require,module,exports){

"use strict";

const {MersenneTwister} = require('./mersenne');

// A random number generator factory G should satisfy the following
// interface:
//
//      // Create a new generator with the given integer seed.
//      g = G(seed);
//
//      // Generate a new random number x, where 0 <= x < 1
//      // Every invocation increments an internal tick
//      // count.
//      g.random();
//
//      // Extract the tick count, which is the number of
//      // times random() has been called after the initialization
//      // of the generator.
//      g.ticks();
//
//      // Extract the current state of the generator as a
//      // plain JSON object.  This will preserve the tick
//      // count as well.
//      s = g.extractState();
//
//      // Set the state of the generator to a previously
//      // extracted state from another generator created
//      // from the same factory.
//      g.injectState(s);
//

module.exports = {Default: MersenneTwister, MersenneTwister}

},{"./mersenne":11}],14:[function(require,module,exports){

"use strict";

const { forEachArray } = require("./helpers");
const { Genome } = require("./genome");
const { sigmoid } = require("./activation");
const { InputNodeGene, OutputNodeGene, HiddenNodeGene,
         NodeEdgeGene, GateEdgeGene,
         DisableEdgeGene, DisableNodeGene } = require("./genes");

// A simulation encapsulates all the information relevant to running
// the system.

class Simulation {
    constructor({numInputs, numOutputs}) {
        // ASSERT: Number.isInteger(numInputs) && numInputs > 0
        // ASSERT: Number.isInteger(numOutputs) && numOutputs > 0

        // The number of inputs and outputs for the problem is tracked
        // at the simulation level.
        this.numInputs = numInputs;
        this.numOutputs = numOutputs;
        this.numFixed = numInputs + numOutputs;
        this.inputNodes = [];
        this.outputNodes = [];
        this.startingEdges = [];

        // Map from lineageIds to genes for all genes in the genome.
        this.allGenesById = new Map();

        // Map from gene reprStrings to genes.  ReprStrings do not
        // include the lineageId, This is used to
        // de-duplicate identical genes added during the same generation.
        this.allGenesByContent = new Map();

        // Set of all genomes ever created.
        this.allGenomes = new Set();

        // The current generation and associated info.
        this.generation = 0;
        this.currentGenomes = new Map();
        this.currentNetworks = new Map();

        // The minimal genome with no hidden nodes.
        this.minimalGenome = null;

        // Tracking ids
        this.nextLineageId = 1;
        this.nextGenomeId = 1;
        this.nextNetworkId = 1;

        // There are a fixed set of InputNode and OutputNode
        // genes per simulation.  They are the implied prefix
        // genes of every genome in the simulation.
        for (let i = 0; i < this.numInputs; i++) {
            this.inputNodes.push(this.createInputNodeGene(i));
        }
        for (let i = 0; i < this.numOutputs; i++) {
            this.outputNodes.push(this.createOutputNodeGene(i));
        }

        // The starting set of edge genes just connects all inputs
        // to all outputs.  Create these edges and add them.
        for (let i = 0; i < this.numInputs; i++) {
            for (let j = 0; j < this.numOutputs; j++) {
                this.startingEdges.push(this.createStartingEdgeGene(i, j));
            }
        }

        // Create a minimal genome and add it.
        // const genome0 = this.createMinimalGenome();
        //this.addCurrentGenome(genome0);
    }

    genLineageId() {
        return this.nextLineageId++;
    }
    genGenomeId() {
        return this.nextGenomeId++;
    }
    genNetworkId() {
        return this.nextNetworkId++;
    }

    inputNodeGeneIdFor(inputNo) {
        // ASSERT: inputNo < this.numInputs
        return 1 + inputNo;
    }
    outputNodeGeneIdFor(outputNo) {
        // ASSERT: outputNo < this.numOutputs
        return 1 + this.numInputs + outputNo;
    }
    startingEdgeGeneIdFor(inputNo, outputNo) {
        return 1 + this.numInputs + this.numOutputs +
               (inputNo * this.numOutputs) + outputNo;
    }

    isInputNodeGene(nodeId) {
        return (nodeId > 0) && (nodeId <= this.numInputs);
    }
    isOutputNodeGene(nodeId) {
        return (nodeId > this.numInputs) && (nodeId <= this.numFixed);
    }

    isAllocatedGene(lineageId) {
        return lineageId > this.numFixed;
    }
    forEachInputNodeGene(cb) {
        return forEachArray(this.inputNodes, cb);
    }
    forEachOutputNodeGene(cb) {
        return forEachArray(this.outputNodes, cb);
    }
    forEachStartingEdgeGene(cb) {
        return forEachArray(this.startingEdges, cb);
    }

    // Creates a new gene with the given class and arguments, checking
    // for duplicates in the same generation.
    newGeneHelper(cls, ...args) {
        const repr = this.generation + "/" + cls.reprString(...args);
        let result = this.allGenesByContent.get(repr);
        if (!result) {
            const lineageId = this.genLineageId();
            result = new cls(lineageId, this.generation, ...args);
            this.allGenesById.set(lineageId, result);
            this.allGenesByContent.set(repr, result);
        }
        return result;
    }
    createInputNodeGene(inputNo) {
        // ASSERT: this.generation == 0
        // ASSERT: 0 <= inputNo < this.numInputs
        // ASSERT: this.nextLineageId == this.inputNodeGeneIdFor(inputNo)
        return this.newGeneHelper(InputNodeGene, inputNo);
    }
    createOutputNodeGene(outputNo) {
        // ASSERT: this.generation == 0
        // ASSERT: 0 <= outputNo < this.numOutputs
        // ASSERT: this.nextLineageId == this.outputNodeGeneIdFor(outputNo)
        const actfName = sigmoid.name;
        return this.newGeneHelper(OutputNodeGene, actfName, outputNo);
    }
    createHiddenNodeGene(actfName) {
        // ASSERT: this.generation > 0
        // ASSERT: this.nextLineageId >= 1 + this.numInputs + this.numOutputs
        return this.newGeneHelper(HiddenNodeGene, actfName);
    }
    createNodeEdgeGene(fromNodeId, toNodeId) {
        // ASSERT: this.allGenesById.get(fromNodeId).kind in ["InputNode",
        //                                                    "HiddenNode"]
        // ASSERT: this.allGenesById.get(toNodeId).kind in ["HiddenNode",
        //                                                  "OutputNode"]
        // ASSERT: fromNodeId < toNodeId
        return this.newGeneHelper(NodeEdgeGene, fromNodeId, toNodeId);
    }
    createStartingEdgeGene(inputNo, outputNo) {
        // ASSERT: this.generation == 0
        // ASSERT: 0 <= inputNo < this.numInputs
        // ASSERT: 0 <= outputNo < this.numOutputs
        // ASSERT: this.nextLineageId == this.startingEdgeGeneIdFor(inputNo,
        //                                                          outputNo)
        const inputId = this.inputNodeGeneIdFor(inputNo);
        const outputId = this.outputNodeGeneIdFor(outputNo);
        return this.createNodeEdgeGene(inputId, outputId);
    }
    createGateEdgeGene(fromNodeId, targetEdgeId) {
        // ASSERT: this.allGenesById.get(fromNodeId).kind in ["InputNode",
        //                                                    "HiddenNode"]
        // ASSERT: this.allGenesById.get(targetEdgeId).kind == "NodeEdge"
        // ASSERT: fromNodeId < targetEdgeId
        return this.newGeneHelper(GateEdgeGene, fromNodeId, targetEdgeId);
    }
    createDisableEdgeGene(edgeId) {
        // ASSERT: this.allGenesById.get(edgeId).kind in ["NodeEdge",
        //                                                "GateEdge"]
        return this.newGeneHelper(DisableEdgeGene, edgeId);
    }
    createDisableNodeGene(nodeId) {
        // ASSERT: this.allGenesById.get(nodeId).kind in ["InputNode",
        //                                                "HiddenNode",
        //                                                "OutputNode"]
        return this.newGeneHelper(DisableNodeGene, nodeId);
    }

    // Initialize a new minimal genome for the simulation.
    createMinimalGenome() {
        return new Genome(this.genGenomeId(), this, []);
    }

    addToCurrentGenome(genome) {
        // ASSERT: genome.simulation === this
        // ASSERT: ! this.currentGenomes.has(genome.genomeId)
        this.allGenomes.add(genome);
        this.currentGenomes.set(genome.genomeId, genome);
    }
}

module.exports = { Simulation };

},{"./activation":6,"./genes":8,"./genome":9,"./helpers":10}]},{},[7]);
