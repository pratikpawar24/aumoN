/**
 * Graph data structure for routing algorithms.
 * Adjacency list representation.
 */

class Graph {
  constructor() {
    this.adjacencyList = new Map();
    this.nodeCoords    = new Map();
  }

  addNode(id, lat, lng) {
    if (!this.adjacencyList.has(id)) {
      this.adjacencyList.set(id, []);
    }
    this.nodeCoords.set(id, { lat, lng });
  }

  addEdge(from, to, attrs = {}) {
    if (!this.adjacencyList.has(from)) this.adjacencyList.set(from, []);
    this.adjacencyList.get(from).push({ to, ...attrs });
  }

  addBidirectionalEdge(from, to, attrs = {}) {
    this.addEdge(from, to, attrs);
    this.addEdge(to, from, attrs);
  }

  getNeighbors(nodeId) {
    return this.adjacencyList.get(nodeId) || [];
  }

  getCoords(nodeId) {
    return this.nodeCoords.get(nodeId) || null;
  }

  hasNode(nodeId) {
    return this.adjacencyList.has(nodeId);
  }

  get nodeCount() {
    return this.adjacencyList.size;
  }

  get edgeCount() {
    let count = 0;
    for (const edges of this.adjacencyList.values()) {
      count += edges.length;
    }
    return count;
  }

  toPlainObject() {
    const graph = {};
    for (const [node, edges] of this.adjacencyList.entries()) {
      graph[node] = edges;
    }
    return graph;
  }

  static fromPlainObject(obj) {
    const g = new Graph();
    for (const [node, edges] of Object.entries(obj)) {
      g.adjacencyList.set(node, edges);
    }
    return g;
  }
}

module.exports = Graph;