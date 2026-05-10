import React from 'react';
import { Navigation, Users, BarChart3, Zap } from 'lucide-react';
import Footer from '../components/Common/Footer';

const AboutPage = () => (
  <>
    <div className="min-h-screen aumo-bg-page pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold aumo-text-primary mb-4">
            About <span className="text-green-500">AUMO</span>
          </h1>
          <p className="aumo-text-muted text-lg">
            AI-powered Urban Mobility Optimizer — research-backed sustainable routing.
          </p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 border aumo-border aumo-bg-surface space-y-4">
          <h2 className="text-xl font-bold aumo-text-primary">The research</h2>
          <p className="aumo-text-muted leading-relaxed">
            AUMO implements carbon-aware urban mobility optimization from our research paper.
            Routing uses Dijkstra and A* with emission-weighted edges:
          </p>
          <pre className="rounded-xl p-4 border font-mono text-sm text-green-500 overflow-x-auto
                          aumo-bg-elevated"
               style={{ borderColor: 'rgba(34,197,94,0.25)' }}>
{`E_total = Σ(d_i × EF_i)
weight  = α·time + β·CO₂ + γ·distance
h(n)    = haversine(n, target) × avg_EF`}
          </pre>
          <p className="aumo-text-muted leading-relaxed">
            Carpooling uses DBSCAN spatial-temporal clustering to group compatible passengers,
            then graph-based optimization assigns them to vehicles minimizing total emissions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: Navigation, title: 'Carbon-Aware Routing', color: '#22c55e',
              desc: 'A* + Dijkstra with configurable α, β, γ weights for time, CO₂, and distance.',
            },
            {
              icon: Users, title: 'DBSCAN Carpooling', color: '#8b5cf6',
              desc: 'Spatial-temporal clustering groups passengers within 2 km / 30-min windows.',
            },
            {
              icon: BarChart3, title: 'Live Traffic', color: '#f59e0b',
              desc: 'TomTom Flow Segment Data plus an ML predictor for congestion-aware re-routing.',
            },
            {
              icon: Zap, title: 'Open Map Stack', color: '#06b6d4',
              desc: 'Nominatim, Overpass, OSRM, Photon — built on free, open mapping APIs.',
            },
          ].map(({ icon: Icon, title, color, desc }) => (
            <div key={title}
                 className="rounded-xl p-5 border aumo-border aumo-bg-surface">
              <Icon className="w-6 h-6 mb-3" style={{ color }} />
              <h3 className="font-semibold aumo-text-primary text-sm mb-2">{title}</h3>
              <p className="aumo-text-subtle text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    <Footer />
  </>
);

export default AboutPage;
