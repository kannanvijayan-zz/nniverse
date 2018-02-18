
"use strict";

const {Gene} = require("./genes");
const {Network} = require("./network");
const {forEachArray} = require("./helpers");

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
