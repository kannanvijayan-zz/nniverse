
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
