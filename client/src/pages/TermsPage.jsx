import React from 'react';
import { FileCheck, ShieldAlert, Zap } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const TermsPage = () => {
  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Terms of Service & Host Guidelines — ChargeShare Bengaluru"
        description="ChargeShare India Terms of Service. Review rules for peer-to-peer EV two-wheeler charging, host premises safety, and platform liability in Bengaluru."
        canonical="/terms"
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold border border-brand/20">
            <FileCheck className="w-3.5 h-3.5 text-brand" />
            <span>Platform Agreement</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-text-primary tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-text-secondary">
            Applicable to all EV two-wheeler riders and host partners across Bengaluru, Karnataka
          </p>
        </div>

        {/* Disclaimer Banner */}
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-xs text-text-primary leading-relaxed shadow-luxury-sm">
          <strong className="text-amber-500">Notice:</strong> This policy text is a template provided for platform demonstration and portfolio purposes and does not constitute formal legal advice.
        </div>

        {/* Content Body */}
        <div className="bg-surface border border-border rounded-4xl p-8 sm:p-12 shadow-luxury-sm space-y-8 text-xs text-text-secondary leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand" />
              <span>1. Peer-to-Peer Charging Relationship</span>
            </h2>
            <p>
              ChargeShare India acts strictly as a technology intermediary enabling individual residential homeowners, apartment societies, and commercial shopkeepers (&ldquo;Hosts&rdquo;) in Bengaluru to share surplus 16A electric vehicle charging capacity with electric two-wheeler riders (&ldquo;EV Owners&rdquo;). We do not own or maintain physical electrical wiring or power transformers.
            </p>
          </section>

          <section className="space-y-2 pt-6 border-t border-border">
            <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-brand" />
              <span>2. Host Safety Standards & Installation Warranties</span>
            </h2>
            <p>
              Hosts warrant that any electrical socket listed has dedicated grounding (neutral-to-earth potential under 5V), miniature circuit breakers (MCBs), and compliance with Central Electricity Authority (Measures relating to Safety and Electric Supply) Regulations.
            </p>
          </section>

          <section className="space-y-2 pt-6 border-t border-border">
            <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-brand" />
              <span>3. Rider Conduct & Bay Access</span>
            </h2>
            <p>
              Riders agree to park exclusively within designated bay demarcations, display their digital QR gate pass to building security personnel, unplug promptly upon session completion, and never use uncertified makeshift electrical adapters.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
