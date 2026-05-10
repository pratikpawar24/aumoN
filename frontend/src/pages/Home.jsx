import React from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf, Navigation, Users, BarChart3,
  Zap, Shield, Globe, ArrowRight, Map
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Footer from '../components/Common/Footer';

const FeatureCard = ({ icon: Icon, title, desc, color }) => (
  <div className="rounded-2xl p-6 border aumo-border aumo-bg-surface
                  transition-all group hover:-translate-y-1 duration-300">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
         style={{ background: `${color}20` }}>
      <Icon className="w-6 h-6" style={{ color }} />
    </div>
    <h3 className="font-semibold aumo-text-primary mb-2">{title}</h3>
    <p className="aumo-text-muted text-sm leading-relaxed">{desc}</p>
  </div>
);

const StatBadge = ({ value, label }) => (
  <div className="text-center">
    <p className="text-3xl font-bold text-green-500">{value}</p>
    <p className="aumo-text-muted text-sm mt-1">{label}</p>
  </div>
);

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen aumo-bg-page">
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96
                        bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                          border border-green-500/30 text-sm text-green-500 mb-6
                          aumo-bg-surface">
            <Leaf className="w-4 h-4" />
            AI-Powered Urban Mobility Optimizer
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold aumo-text-primary mb-6 leading-tight">
            Smarter Routes,<br />
            <span className="text-transparent bg-clip-text
                             bg-gradient-to-r from-green-400 to-green-600">
              Greener Planet
            </span>
          </h1>

          <p className="text-lg aumo-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            AUMO optimizes your daily commute using carbon-aware AI algorithms,
            smart carpooling with DBSCAN clustering, and real-time traffic prediction —
            all built on the Dijkstra's + A* routing engine from our research paper.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={isAuthenticated ? '/map' : '/register'}
                  className="flex items-center justify-center gap-2 px-8 py-4
                             bg-green-500 hover:bg-green-600 text-white font-semibold
                             rounded-xl transition-all shadow-lg shadow-green-500/30
                             hover:shadow-green-500/50 group">
              <Map className="w-5 h-5" />
              {isAuthenticated ? 'Open Map' : 'Get Started Free'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/about"
                  className="flex items-center justify-center gap-2 px-8 py-4
                             border aumo-border aumo-text-primary aumo-bg-surface font-semibold
                             rounded-xl transition-all">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y aumo-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <StatBadge value="60%" label="CO₂ Reduction Potential" />
            <StatBadge value="A*"  label="Carbon-Aware Algorithm"  />
            <StatBadge value="4x"  label="Passengers Per Vehicle"  />
            <StatBadge value="5+"  label="Transport Modes"         />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold aumo-text-primary mb-3">Everything you need</h2>
            <p className="aumo-text-muted">Powered by AI, designed for sustainability</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={Navigation} color="#22c55e" title="Carbon-Aware Routing"
              desc="Dijkstra's + A* algorithms with emission-weighted edges. Formula: E = Σ(d_i × EF_i)" />
            <FeatureCard icon={Users} color="#8b5cf6" title="Smart Carpooling"
              desc="DBSCAN spatial-temporal clustering matches compatible passengers automatically." />
            <FeatureCard icon={Zap} color="#f59e0b" title="Traffic Prediction"
              desc="ML-based congestion prediction adjusts route weights in real-time." />
            <FeatureCard icon={Globe} color="#06b6d4" title="Rich Map Data"
              desc="Building names, bus stops, shops, and POIs from OpenStreetMap & Overpass API." />
            <FeatureCard icon={BarChart3} color="#ec4899" title="Emission Dashboard"
              desc="Track your carbon savings, green score, and compete on the leaderboard." />
            <FeatureCard icon={Shield} color="#64748b" title="Multi-Modal Support"
              desc="Car, electric, bus, bike, walk — choose the greenest mode for every trip." />
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="py-20 px-4">
          <div className="max-w-2xl mx-auto text-center aumo-bg-surface rounded-2xl p-10
                          border border-green-500/20">
            <Leaf className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold aumo-text-primary mb-3">
              Ready to go green?
            </h2>
            <p className="aumo-text-muted mb-6">
              Join thousands of commuters reducing their carbon footprint with AUMO.
            </p>
            <Link to="/register"
                  className="inline-flex items-center gap-2 px-8 py-4
                             bg-green-500 hover:bg-green-600 text-white font-semibold
                             rounded-xl transition-all shadow-lg shadow-green-500/25">
              <Leaf className="w-5 h-5" />
              Start for Free
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Home;