/**
 * NoT.js - Network of Thoughts JavaScript implementation
 * This is a simplified version of NoT.js that implements ThoughtNode and ThoughtChain
 */

class ThoughtNode {
  constructor(type, content, metadata = {}) {
    this.type = type;       // Type of the observation (e.g., 'request', 'cookie', 'script')
    this.content = content; // Description of the observation
    this.metadata = metadata; // Additional data about the observation
    this.timestamp = Date.now();
  }

  toString() {
    return `[${this.type}] ${this.content}`;
  }
}

class ThoughtChain {
  constructor(name) {
    this.name = name;
    this.nodes = [];
  }

  addNode(node) {
    this.nodes.push(node);
    return this;
  }

  // Original method (to be replaced)
  // classify() {
  //   return rf.predict(this.nodes);
  // }

  // New method using GPT as classifier
  async classify() {
    // This will be implemented to use GPT instead of Random Forest
    const { classifyWithGPT } = require('./gptClassifier');
    const text = this.nodes.map(n => `${n.toString()}`).join('\n');
    return await classifyWithGPT(text);
  }

  // Get a formatted summary of all nodes
  getSummary() {
    return this.nodes.map((node, index) => 
      `${index + 1}. ${node.toString()}`
    ).join('\n');
  }
}

module.exports = {
  ThoughtNode,
  ThoughtChain
}; 