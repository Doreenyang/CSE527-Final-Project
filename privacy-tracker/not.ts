/**
 * NoT.js - Network of Thoughts TypeScript implementation
 * This is a simplified version of NoT.js that implements ThoughtNode and ThoughtChain
 */

import { classifyWithGPT } from './gptClassifier';

export interface ThoughtNodeMetadata {
  [key: string]: any;
}

export class ThoughtNode {
  type: string;
  content: string;
  metadata: ThoughtNodeMetadata;
  timestamp: number;

  constructor(type: string, content: string, metadata: ThoughtNodeMetadata = {}) {
    this.type = type;       // Type of the observation (e.g., 'request', 'cookie', 'script')
    this.content = content; // Description of the observation
    this.metadata = metadata; // Additional data about the observation
    this.timestamp = Date.now();
  }

  toString(): string {
    return `[${this.type}] ${this.content}`;
  }
}

export class ThoughtChain {
  name: string;
  nodes: ThoughtNode[];

  constructor(name: string) {
    this.name = name;
    this.nodes = [];
  }

  addNode(node: ThoughtNode): ThoughtChain {
    this.nodes.push(node);
    return this;
  }

  // Original method (to be replaced)
  // classify() {
  //   return rf.predict(this.nodes);
  // }

  // New method using GPT as classifier
  async classify() {
    // Use GPT instead of Random Forest
    const text = this.nodes.map(n => `${n.toString()}`).join('\n');
    return await classifyWithGPT(text);
  }

  // Get a formatted summary of all nodes
  getSummary(): string {
    return this.nodes.map((node, index) => 
      `${index + 1}. ${node.toString()}`
    ).join('\n');
  }
} 