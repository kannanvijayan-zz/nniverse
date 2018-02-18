
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
