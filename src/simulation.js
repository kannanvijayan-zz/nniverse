
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
