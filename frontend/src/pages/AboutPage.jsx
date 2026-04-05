import React from 'react';
import { Leaf, Navigation, Users, BarChart3, Zap } from 'lucide-react';

const AboutPage = () => (
  <div className="min-h-screen bg-dark-bg pt-20 pb-12 px-4">
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          About <span className="text-primary-400">AUMO</span>
        </h1>
        <p className="text-slate-400 text-lg">
          AI-powered Urban Mobility Optimizer — Research-backed sustainable routing
        </p>
      </div>

      <div className="glass rounded-2xl p-8 border border-white/10 space-y-4">
        <h2 className="text-xl font-bold text-white">The Research</h2>
        <p className="text-slate-300 leading-relaxed">
          AUMO is built on our research paper exploring carbon-aware urban mobility optimization.
          We implement Dijkstra's and A* algorithms with emission-weighted edges:
        </p>
        <div className="glass rounded-xl p-4 border border-primary-500/20 font-mono text-sm
                        text-primary-400">
          E_total = Σ(d_i × EF_i)
          <br />
          Weight = α×time + β×CO₂ + γ×distance
          <br />
          h(n) = haversine(n, target) × avg_EF
        </div>
        <p className="text-slate-300 leading-relaxed">
          Carpooling uses DBSCAN spatial-temporal clustering to group compatible passengers,
          then graph-based optimization assigns them to vehicles minimizing total emissions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: Navigation, title: 'Carbon-Aware Routing',  color: '#22c55e',
            desc: 'A* + Dijkstra with configurable α, β, γ weights for time, CO₂, and distance.' },
          { icon: Users,      title: 'DBSCAN Carpooling',     color: '#8b5cf6',
            desc: 'Spatial-temporal clustering groups passengers within 2km and 30min windows.' },
          { icon: BarChart3,  title: 'ML Traffic Prediction', color: '#f59e0b',
            desc: 'Gradient Boosting model predicts congestion from hour, day, and road type.' },
          { icon: Zap,        title: 'Free APIs Only',        color: '#06b6d4',
            desc: 'Nominatim, Overpass, OSRM, Photon — zero API costs for rich map data.' },
        ].map(({ icon: Icon, title, color, desc }) => (
          <div key={title} className="glass rounded-xl p-5 border border-white/10">
            <Icon className="w-6 h-6 mb-3" style={{ color }} />
            <h3 className="font-semibold text-white text-sm mb-2">{title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default AboutPage;