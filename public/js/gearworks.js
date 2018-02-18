(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){

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

},{}],2:[function(require,module,exports){

let helpers = require('./helpers');
let mersenne = require('./mersenne');
let randgen = require('./randgen');
let activation = require('./activation');
let genes = require('./genes');
let network = require('./network');
let genome = require('./genome');
let simulation = require('./simulation');

},{"./activation":1,"./genes":3,"./genome":4,"./helpers":5,"./mersenne":6,"./network":7,"./randgen":8,"./simulation":9}],3:[function(require,module,exports){

"use strict";

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
});
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
        return accum.join("");
    }
    genReprString(...params) {
        return this.constructor.genReprString(...params);
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
        // ASSERT: Number.isInteger(offset) && offset >= 0
        // ASSERT: this.weightOffset == -1
        this.weightOffset = offset;
    }
    setStateOffset(offset) {
        // ASSERT: Number.isInteger(offset) && offset >= 0
        // ASSERT: this.stateOffset == -1
        this.stateOffset = offset;
    }
    setTraceOffset(offset) {
        // ASSERT: Number.isInteger(offset) && offset >= 0
        // ASSERT: this.traceOffset == -1
        this.traceOffset = offset;
    }
    setDisabledBy(descr) {
        this.disabled = descr;
    }
    setStageNo(stageNo) {
        // ASSERT: stageNo >= 0
        // ASSERT: this.stageNo == -1
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

    descriptor() { return OutputNodeDescriptor(this); }
}
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

    descriptor() { return HiddenNodeDescriptor(this); }
}
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

    descriptor() { return NodeEdgeDescriptor(this); }
}
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

    descriptor() { return GateEdgeDescriptor(this); }
}
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

    descriptor() { return DisableEdgeDescriptor(this); }
}
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

    descriptor() { return DisableNodeDescriptor(this); }
}
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

},{"./activation":1,"./helpers":5}],4:[function(require,module,exports){

"use strict";

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
        this.nodesByStage = actOrder.getNodesByStage();
        this.edgesByStage = actOrder.getEdgesByStage();

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
        this.forEachNodeByStage(descr => {
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
        const descrList = this.descrlist;
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
    forEachNodeByStage(cb, skipFirst=false) {
        const nodesByStage = this.nodesByStage;
        const first = skipFirst ? 1 : 0;
        for (let s = first; s < nodesByStage.length; s++) {
            const stageNodes = nodesByStage[s];
            let r;
            for (let i = 0; i < stageNodes.length; i++) {
                r = cb(stageNodes[i], s, i);
                if (r === false) { return false; }
            }
            return r;
        }
    }
    forEachNodeByStageSkipFirst(cb) {
        return this.forEachNodeByStage(cb, /* skipFirst = */ true);
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

    getNodesByStage() {
        return this.stages.map(stage => stage.nodes);
    }
    getEdgesByStage() {
        return this.stages.map(stage => stage.edges);
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
                node.forEachOutgoingEdge(edge => {
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

},{"./genes":3,"./helpers":5,"./network":7}],5:[function(require,module,exports){

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

},{}],6:[function(require,module,exports){

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

    initSeed(s) {
        // ASSERT: Number.isInteger(s) && s >= 0
        this.mt[0] = s >>> 0;
        for (let i = 1; i < N; i++) {
            var s = this.mt[i - 1] ^ (this.mt[i-1] >>> 30);
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

},{}],7:[function(require,module,exports){

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

},{}],8:[function(require,module,exports){

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

},{"./mersenne":6}],9:[function(require,module,exports){

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
        this.inputNodes = new Array(numInputs);
        this.outputNodes = new Array(numOutputs);
        this.startingEdges = new Array(numInputs + numOutputs);

        // Map from lineageIds to genes for all genes in the genome.
        this.allGenesById = new Map();

        // Map from gene reprStrings to genes.  ReprStrings do not
        // include the lineageId, This is used to
        // de-duplicate identical genes added during the same generation.
        this.allGenesByContent = new Map();

        // Set of all geneLists ever created.
        // Two identical geneLists can not be created because new geneLists
        // are created by appending to previous ones, and new genes
        // refer to their generation, and get a unique lineageId.
        this.allGeneLists = new Set();

        // The current generation and associated info.
        this.generation = 0;
        this.currentGenomes = new Map();
        this.currentNetworks = new Map();

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
        const repr = this.generation + "/" + cls.genReprString(...args);
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
}

module.exports = { Simulation };

},{"./activation":1,"./genes":3,"./genome":4,"./helpers":5}]},{},[2]);
