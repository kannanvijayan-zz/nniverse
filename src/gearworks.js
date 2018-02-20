
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
