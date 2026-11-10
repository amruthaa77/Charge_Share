import React from 'react';
import { Shield, Lock, FileText, Mail, MapPin, Clock } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const PrivacyPage = () => {
  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Privacy Policy & DPDP Act Compliance — ChargeShare Bengaluru"
        description="ChargeShare India Privacy Policy. Learn how your data is collected, stored, and protected under the Digital Personal Data Protection Act 2023."
        canonical="/privacy"
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold border border-brand/20">
            <Shield className="w-3.5 h-3.5 text-brand" />
            <span>DPDP Act 2023 Compliant</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-text-primary tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-text-secondary">
            Last Updated: October 2026 • Effective for all Bengaluru two-wheeler community members
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
              <Lock className="w-4 h-4 text-brand" />
              <span>1. Commitment to Personal Data Protection</span>
            </h2>
            <p>
              ChargeShare India (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is dedicated to safeguarding the privacy and digital sovereignty of all EV two-wheeler riders and host partners in Bengaluru, Karnataka. This document outlines our data practices in full conformity with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and the Information Technology Act, 2000.
            </p>
          </section>

          <section className="space-y-2 pt-6 border-t border-border">
            <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              <span>2. Categories of Data We Collect</span>
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Identity & Account Data:</strong> Full legal name, verified email address, Indian mobile phone number, and hashed authentication credentials.
              </li>
              <li>
                <strong>Vehicle Specifications:</strong> EV brand, scooter model (Ather, Ola, TVS, Chetak), battery pack capacity (kWh), and 16A 3-pin connector interface.
              </li>
              <li>
                <strong>Geographical & Location Information:</strong> Operating strictly within Bengaluru municipal boundaries (latitude: 12.80 to 13.15, longitude: 77.45 to 77.75).
              </li>
              <li>
                <strong>Charging Session & Financial Records:</strong> Timestamps of bookings, power consumed, Razorpay order IDs, and automated refund receipts.
              </li>
              <li>
                <strong>Host Verification Documentation:</strong> BESCOM electricity bill excerpts, MCB breaker inspection photos, and society NOC consent records.
              </li>
            </ul>
          </section>

          <section className="space-y-2 pt-6 border-t border-border">
            <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand" />
              <span>3. Legal Grounds and Purpose of Processing</span>
            </h2>
            <p>
              We process personal data solely on the basis of affirmative user consent or for the legitimate performance of charging reservations:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Facilitating instant or advance 16A socket reservations between verified riders and hosts.</li>
              <li>Generating digital QR entry passes for security verification at residential apartment gates.</li>
              <li>Processing contactless Razorpay payments and automated refund routing.</li>
            </ul>
          </section>

          <section className="space-y-2 pt-6 border-t border-border">
            <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand" />
              <span>4. Designated Grievance Officer</span>
            </h2>
            <p>
              In accordance with Section 10(2) of the DPDP Act 2023, ChargeShare India has appointed a designated Grievance Officer:
            </p>
            <div className="p-4 rounded-2xl bg-bg border border-border space-y-1 text-xs text-text-secondary">
              <p><strong className="text-text-primary">Name:</strong> Aditi Sharma (Legal & Grievance Lead)</p>
              <p><strong className="text-text-primary">Desk:</strong> support@chargeshare.in</p>
              <p><strong className="text-text-primary">Address:</strong> 100ft Road, Indiranagar, Bengaluru, Karnataka 560038</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
