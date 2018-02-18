
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
