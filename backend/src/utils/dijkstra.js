/**
 * Dijkstra's algorithm — Node.js backend implementation.
 * Used as fallback when AI service is unavailable.
 */
const { getBaseEF } = require('./emissionFactors');

const dijkstra = (graph, source, target, vehicleType = 'car', alpha = 0.4, beta = 0.4, gamma = 0.2) => {
  const dist     = { [source]: 0 };
  const distKm   = { [source]: 0 };
  const timeMin  = { [source]: 0 };
  const emGrams  = { [source]: 0 };
  const prev     = { [source]: null };
  const visited  = new Set();
  const pq       = [[0, source]]; // [priority, node]
  const ef       = getBaseEF(vehicleType);

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [currDist, u] = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === target) break;

    for (const edge of graph[u] || []) {
      const v = edge.to;
      if (visited.has(v)) continue;

      const d     = edge.distance_km    || 0.1;
      const speed = edge.speed_limit_kmh || 40;
      const t     = (d / speed) * 60;
      const e     = d * ef;

      const w = alpha * (t / 60) + beta * (e / 500) + gamma * (d / 50);
      const newDist = (dist[u] || 0) + w;

      if (newDist < (dist[v] || Infinity)) {
        dist[v]    = newDist;
        distKm[v]  = (distKm[u] || 0) + d;
        timeMin[v] = (timeMin[u] || 0) + t;
        emGrams[v] = (emGrams[u] || 0) + e;
        prev[v]    = u;
        pq.push([newDist, v]);
      }
    }
  }

  if (!(target in prev) && target !== source) return null;

  // Reconstruct path
  const path = [];
  let curr = target;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev[curr];
  }

  const totalDist  = distKm[target]  || 0;
  const totalTime  = timeMin[target] || 0;
  const totalEm    = emGrams[target] || 0;
  const baseline   = totalDist * 150;
  const saved      = Math.max(0, baseline - totalEm);
  // Honest 0-100: 100 = zero emissions, 0 = at-or-above baseline.
  // Old formula was (saved/baseline)*100 + 50, which floored at 50.
  const savingsPct = baseline > 0 ? (saved / baseline) * 100 : 0;
  const greenScore = Math.max(0, Math.min(100, savingsPct));

  return {
    path,
    total_distance_km:  Math.round(totalDist  * 100) / 100,
    total_time_minutes: Math.round(totalTime  * 10)  / 10,
    total_emissions_g:  Math.round(totalEm),
    carbon_saved_g:     Math.round(saved),
    baseline_emission_g:Math.round(baseline),
    green_score:        Math.round(greenScore),
    algorithm:          'dijkstra_nodejs_fallback',
  };
};

module.exports = { dijkstra };