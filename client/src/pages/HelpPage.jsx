import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, HelpCircle, Zap, ShieldCheck, CreditCard, LifeBuoy, Bike } from 'lucide-react';
import { SEO } from '../components/common/SEO';

const FAQ_ITEMS = [
  {
    category: 'Booking & Charging',
    question: 'How does instant "Book Now" charging work without picking rigid slots?',
    answer:
      'Unlike legacy charging networks that force rigid 60-minute blocks, ChargeShare India allows you to book immediately if a two-wheeler socket is currently Available and verified. Tap "Book Bay Now" for immediate plug-in or choose flexible durations (from 30 to 120 minutes) when reserving ahead.',
  },
  {
    category: 'Booking & Charging',
    question: 'How do I locate two-wheeler 16A bays in Bengaluru?',
    answer:
      'Our map is strictly geofenced to Bengaluru, Karnataka. You can browse high-density clusters across Indiranagar, Koramangala, HSR Layout, Whitefield, Bellandur, and Electronic City, with filters for 16A 3-pin sockets, earthing verification, and instant plug-in status.',
  },
  {
    category: 'Emergency Charging',
    question: 'What is Emergency Charging SOS mode and when should I use it?',
    answer:
      'If your electric scooter battery is critically low (under 15%) in Bengaluru traffic, tap "SOS Emergency" on any bay or on the map. This bypasses non-essential steps, notifies the host immediately with high priority, transmits your battery percentage, and unlocks the fastest possible plug-in.',
  },
  {
    category: 'Compatibility',
    question: 'Are all electric scooters and bikes supported on ChargeShare India?',
    answer:
      'Yes! ChargeShare India is dedicated exclusively to Bengaluru’s electric two-wheelers. We support Ather 450X & 450S, Ola S1 Pro & Air, TVS iQube, Bajaj Chetak, Hero Vida V1, Simple One, River Indie, and Ultraviolette F77 using standard 16A 3-pin heavy-duty sockets and Bharat AC-001 plugs.',
  },
  {
    category: 'Compatibility',
    question: 'What connectors are available across Bengaluru bays?',
    answer:
      'Our network provides verified 16A 3-pin Indian standard heavy-duty sockets (3.3 kW single phase) and Bharat AC-001 sockets. All electric scooters plug in directly using their manufacturer-supplied portable charging bricks.',
  },
  {
    category: 'Hosting & Earnings',
    question: 'How do I monetize my home or society outdoor socket as a host?',
    answer:
      'Any resident, shop owner, or apartment society in Bengaluru with a safe, grounded 16A socket can register via "List Socket". Submit photos of your breaker setup and earthing proof. Once verified by our safety team, your bay goes live. You set your rate per hour or per kWh and receive 95% of each booking amount directly.',
  },
  {
    category: 'Hosting & Earnings',
    question: 'What safety requirements must hosts meet?',
    answer:
      'Hosts must have dedicated 16A miniature circuit breakers (MCBs), functional residual current breakers (RCCB/ELCB), verified earthing with earth-to-neutral potential under 5 Volts AC, and weatherproof enclosure covers if installed outdoors.',
  },
  {
    category: 'Cancellations & Refunds',
    question: 'What is the refund policy if I need to cancel my booking?',
    answer:
      'Cancellations more than 2 hours before the slot start time receive a 100% full refund including the platform fee. Cancellations within 2 hours of slot start receive a 50% partial refund to compensate the host. Bookings are non-refundable once the reserved start time passes.',
  },
  {
    category: 'Safety & Grievance',
    question: 'How do I report a faulty bay or hazardous socket?',
    answer:
      'You can report any faulty or hazardous bay directly using the "Report" button on its station page. For personal data inquiries or formal grievances under the DPDP Act 2023, contact our designated Grievance Desk at support@chargeshare.in.',
  },
];

export const HelpPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState(0);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_ITEMS;
    const q = searchQuery.toLowerCase();
    return FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Help Center & Knowledge Base — ChargeShare Bengaluru"
        description="Frequently asked questions regarding booking 16A EV scooter sockets, emergency SOS mode, host payouts, and refund rules in Bengaluru."
        canonical="/help"
      />

      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold border border-brand/20">
            <HelpCircle className="w-3.5 h-3.5 text-brand" />
            <span>Help & Knowledge Base</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-text-primary tracking-tight">
            How can we assist you?
          </h1>
          <p className="text-sm text-text-secondary max-w-xl mx-auto">
            Answers to common questions about 16A two-wheeler charging, emergency SOS, hosting, and refunds in Bengaluru.
          </p>

          {/* Search Input */}
          <div className="pt-4 max-w-lg mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search earthing, 16A socket, refund, Ather, Ola..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-surface border border-border text-xs text-text-primary shadow-luxury-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-3xl bg-surface border border-border overflow-hidden shadow-luxury-sm transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-text-primary hover:text-brand transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                      {faq.category}
                    </span>
                    <span>{faq.question}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-brand' : 'text-text-muted'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
