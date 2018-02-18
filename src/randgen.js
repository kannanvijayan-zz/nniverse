
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
