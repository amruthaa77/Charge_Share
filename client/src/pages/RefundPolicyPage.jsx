import React from 'react';
import { RefreshCcw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const RefundPolicyPage = () => {
  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Refund & Cancellation Policy — ChargeShare Bengaluru"
        description="ChargeShare India transparent cancellation and refund policy. 100% refund >2h before slot, 50% refund <=2h before slot, and host-cancellation protection."
        canonical="/refund-policy"
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold border border-brand/20">
            <RefreshCcw className="w-3.5 h-3.5 text-brand" />
            <span>Automated Tiered Payouts</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-text-primary tracking-tight">
            Refund & Cancellation Policy
          </h1>
          <p className="text-xs text-text-secondary">
            Automated refunds for Bengaluru two-wheeler riders and host partners
          </p>
        </div>

        {/* Disclaimer Banner */}
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-xs text-text-primary leading-relaxed shadow-luxury-sm">
          <strong className="text-amber-500">Notice:</strong> This policy text is a template provided for platform demonstration and portfolio purposes and does not constitute formal legal advice.
        </div>

        {/* 3 Tier Cards Visual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-brand block">
              &gt; 2 Hours Notice
            </span>
            <div className="font-editorial text-3xl font-bold text-text-primary">
              100% Refund
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Full automated refund of booking fee including platform charges if cancelled 2+ hours before slot start time.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-amber-500 block">
              &le; 2 Hours Notice
            </span>
            <div className="font-editorial text-3xl font-bold text-text-primary">
              50% Refund
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              50% refund credited. The remaining 50% is transferred to the host as compensation for holding their socket.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-rose-500 block">
              After Start Time
            </span>
            <div className="font-editorial text-3xl font-bold text-text-primary">
              0% Refund
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              No refund upon missed or no-show bookings after the slot window begins. Full payout is disbursed to the host.
            </p>
          </div>
        </div>

        {/* Detailed Guidelines */}
        <div className="bg-surface border border-border rounded-4xl p-8 sm:p-12 shadow-luxury-sm space-y-6 text-xs text-text-secondary leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Host Cancellation Guarantee
            </h3>
            <p>
              In the rare event that a host cancels an active booking or denies parking bay access upon arrival, the rider receives an immediate 100% refund, priority SOS reassignment to the nearest available working socket, and a ₹100 credit on their next booking.
            </p>
          </section>

          <section className="space-y-2 pt-6 border-t border-border">
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Refund Processing Window
            </h3>
            <p>
              Refunds are dispatched through Razorpay Routes back to the original funding account (UPI VPA, debit card, or netbanking) within 24 to 72 bank business hours.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
