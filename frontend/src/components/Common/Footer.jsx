import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Github, Heart } from 'lucide-react';

const Footer = () => (
  <footer className="glass border-t border-white/10 py-8 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">
              AU<span className="text-primary-400">MO</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            AI-powered Urban Mobility Optimizer for a greener planet.
          </p>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Features</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link to="/map"       className="hover:text-primary-400 transition-colors">Carbon-Aware Routing</Link></li>
            <li><Link to="/carpool"   className="hover:text-primary-400 transition-colors">Smart Carpooling</Link></li>
            <li><Link to="/dashboard" className="hover:text-primary-400 transition-colors">Emission Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">About</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link to="/about"    className="hover:text-primary-400 transition-colors">About AUMO</Link></li>
            <li><a href="#"          className="hover:text-primary-400 transition-colors">Research Paper</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row
                      items-center justify-between gap-4">
        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} AUMO. All rights reserved.
        </p>
        <p className="text-slate-500 text-sm flex items-center gap-1">
          Made with <Heart className="w-3 h-3 text-red-400" /> for a sustainable future
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;