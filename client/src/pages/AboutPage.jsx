import React from 'react';
import { Zap, Bike, ShieldCheck, HeartHandshake, MapPin, Sparkles } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const AboutPage = () => {
  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="About ChargeShare India — Bengaluru Electric Two-Wheeler Grid"
        description="ChargeShare India powers Bengaluru’s electric mobility with peer-to-peer 16A two-wheeler charging across Indiranagar, Koramangala, HSR Layout, and Whitefield."
        canonical="/about"
      />

      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold border border-brand/20">
            <Zap className="w-3.5 h-3.5 text-brand" />
            <span>Bengaluru Electric Two-Wheeler Community</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-6xl font-bold text-text-primary tracking-tight leading-tight">
            Democratizing EV Charging in India&apos;s Tech Capital
          </h1>
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Unlocking residential and shop 16A sockets so Ather, Ola, TVS, and Chetak commuters never face range anxiety in Bengaluru.
          </p>
        </div>

        {/* Two-Wheeler Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 rounded-4xl bg-surface border border-border shadow-luxury-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <Bike className="w-6 h-6" />
            </div>
            <h3 className="font-editorial text-2xl font-bold text-text-primary">
              Electric Scooters First
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Two-wheelers power over 75% of clean daily commutes across Bengaluru. We connect Ather, Ola Electric, TVS iQube, and Bajaj Chetak riders with verified 16A 3-pin sockets in residential neighborhoods.
            </p>
          </div>

          <div className="p-8 rounded-4xl bg-surface border border-border shadow-luxury-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-editorial text-2xl font-bold text-text-primary">
              Portable Charger Ready
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Nearly every electric two-wheeler comes with an OEM portable charging brick. By verifying earthing safety on standard 16A outlets, any home or shop garage becomes a high-speed charging oasis.
            </p>
          </div>
        </div>

        {/* Narrative & Values */}
        <div className="bg-surface border border-border rounded-4xl p-8 sm:p-12 shadow-luxury-sm space-y-8 text-xs text-text-secondary leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-editorial text-2xl font-bold text-text-primary flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand" />
              <span>Strictly Geofenced to Bengaluru</span>
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              ChargeShare India was intentionally architected for Bengaluru (lat: 12.80–13.15, lng: 77.45–77.75). From the startup corridors of Indiranagar and Koramangala to the outer tech belts of Whitefield and Electronic City, our network turns idle socket capacity into reliable community infrastructure.
            </p>
          </section>

          <section className="space-y-2 pt-6 border-t border-border">
            <h2 className="font-editorial text-2xl font-bold text-text-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand" />
              <span>Safety & Grounding Verification</span>
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Every socket listed on ChargeShare India undergoes a safety audit. We check physical earthing resistance (neutral-to-earth potential &lt;5V), dedicated 16A miniature circuit breakers (MCBs), weatherproofing covers, and host property ownership before activation.
            </p>
          </section>

          <section className="space-y-2 pt-6 border-t border-border">
            <h2 className="font-editorial text-2xl font-bold text-text-primary flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-brand" />
              <span>Community Host Monetization</span>
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Hosts retain 95% of their set charging rate, turning parking spots into green passive revenue. Weekly automated payouts and atomic 10-minute hold reservation locks ensure zero double-booking disputes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
