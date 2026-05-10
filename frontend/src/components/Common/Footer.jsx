import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Mail, Github, Heart } from 'lucide-react';

const TEAM = [
  { name: 'Pratik Pawar',  email: 'pratikpawarpune@gmail.com' },
  { name: 'Shruti Dalvi',  email: 'shrutidalvi8010@gmail.com' },
  { name: 'Rohan Mane',    email: 'rohan.mane@dypic.in'       },
];

const VERSION = process.env.REACT_APP_VERSION || '2.0.0';

const Footer = () => (
  <footer className="border-t aumo-border mt-auto"
          style={{ background: 'var(--aumo-bg-elevated)' }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Brand */}
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold aumo-text-primary">
              AU<span className="text-green-500">MO</span>
            </span>
          </div>
          <p className="aumo-text-subtle text-sm leading-relaxed">
            AI-powered urban mobility optimizer. Carbon-aware routing,
            smart carpooling, and real-time traffic prediction for a
            greener daily commute.
          </p>
        </div>

        {/* Product */}
        <div>
          <h4 className="aumo-text-primary font-semibold text-sm mb-3">Product</h4>
          <ul className="space-y-2 text-sm aumo-text-subtle">
            <li><Link to="/map"       className="hover:aumo-text-primary transition-colors">Map & Routing</Link></li>
            <li><Link to="/carpool"   className="hover:aumo-text-primary transition-colors">Smart Carpool</Link></li>
            <li><Link to="/dashboard" className="hover:aumo-text-primary transition-colors">Dashboard</Link></li>
            <li><Link to="/about"     className="hover:aumo-text-primary transition-colors">About AUMO</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="aumo-text-primary font-semibold text-sm mb-3">Legal</h4>
          <ul className="space-y-2 text-sm aumo-text-subtle">
            <li><Link to="/privacy" className="hover:aumo-text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms"   className="hover:aumo-text-primary transition-colors">Terms of Service</Link></li>
            <li>
              <a href="https://github.com/pratikpawar24/aumoN"
                 target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 hover:aumo-text-primary transition-colors">
                <Github className="w-3 h-3" />Source
              </a>
            </li>
          </ul>
        </div>

        {/* Team */}
        <div>
          <h4 className="aumo-text-primary font-semibold text-sm mb-3">Team</h4>
          <ul className="space-y-2 text-sm aumo-text-subtle">
            {TEAM.map((m) => (
              <li key={m.email}>
                <a href={`mailto:${m.email}`}
                   className="inline-flex items-center gap-1.5 hover:aumo-text-primary transition-colors">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span>
                    <span className="block aumo-text-muted">{m.name}</span>
                    <span className="text-[11px] aumo-text-subtle break-all">{m.email}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t aumo-border pt-5 flex flex-col sm:flex-row
                      items-start sm:items-center justify-between gap-3 text-xs">
        <p className="aumo-text-subtle">
          © {new Date().getFullYear()} AUMO. All rights reserved. · v{VERSION}
        </p>
        <p className="aumo-text-subtle inline-flex items-center gap-1">
          Made with <Heart className="w-3 h-3 text-red-500" /> for a sustainable future.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
