import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Heart, Bike, Leaf, MapPin, Mail, Phone, Settings2 } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new Event('open-cookie-settings'));
  };

  return (
    <footer className="border-t border-border bg-surface text-text-secondary py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        
        {/* Brand & Address */}
        <div className="lg:col-span-2 space-y-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-2xl bg-brand text-brand-contrast border border-brand/20 flex items-center justify-center shadow-luxury-sm">
              <Zap className="w-4 h-4 fill-current" aria-hidden="true" />
            </div>
            <span className="font-editorial text-2xl font-bold tracking-tight text-text-primary">
              Charge<span className="text-brand">Share</span>
            </span>
          </Link>

          <p className="text-[13px] text-text-secondary leading-relaxed max-w-sm">
            Bengaluru&apos;s verified peer-to-peer EV charging community. Connecting electric scooter & motorcycle owners (Ather, Ola, TVS, Chetak) with verified residential and society 16A charging sockets.
          </p>

          <div className="space-y-2 text-[13px] text-text-secondary pt-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
              <span>100ft Road, Indiranagar, Bengaluru, Karnataka 560038</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
              <a href="tel:+918025550199" className="hover:text-brand transition-colors">
                +91 80 2555 0199
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
              <a href="mailto:support@chargeshare.in" className="hover:text-brand transition-colors">
                support@chargeshare.in
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[13px] text-brand font-semibold pt-1">
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>100% Earthing & MCB Safety Certified</span>
          </div>
        </div>

        {/* Platform & Discovery */}
        <div>
          <h4 className="font-editorial text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
            Platform
          </h4>
          <ul className="space-y-2.5 text-[13px]">
            <li>
              <Link to="/explore" className="hover:text-brand transition-colors">
                Explore Bengaluru Map
              </Link>
            </li>
            <li>
              <Link to="/become-a-host" className="hover:text-brand transition-colors">
                List 16A Socket (Monetize)
              </Link>
            </li>
            <li>
              <Link to="/my-bookings" className="hover:text-brand transition-colors">
                My Charging Passes & QR
              </Link>
            </li>
            <li>
              <Link to="/vehicles" className="hover:text-brand transition-colors">
                My Two-Wheeler Garage
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-brand transition-colors">
                About Our Mission
              </Link>
            </li>
            <li>
              <Link to="/help" className="hover:text-brand transition-colors">
                Help Center & FAQs
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Compliance */}
        <div>
          <h4 className="font-editorial text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
            Legal & Compliance
          </h4>
          <ul className="space-y-2.5 text-[13px]">
            <li>
              <Link to="/privacy" className="hover:text-brand transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-brand transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/refund-policy" className="hover:text-brand transition-colors">
                Refund & Cancellation
              </Link>
            </li>
            <li>
              <Link to="/cookies" className="hover:text-brand transition-colors">
                Cookie Policy
              </Link>
            </li>
            <li>
              <Link to="/credits" className="hover:text-brand transition-colors">
                Image Credits & Attribution
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={handleOpenCookieSettings}
                className="hover:text-brand transition-colors text-left flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Cookie Preferences</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Bengaluru Tech Corridors */}
        <div>
          <h4 className="font-editorial text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
            Bengaluru Corridors
          </h4>
          <ul className="space-y-2.5 text-[13px]">
            <li>
              <Link to="/explore?area=Indiranagar" className="hover:text-brand transition-colors">
                Indiranagar 100ft & 12th Main
              </Link>
            </li>
            <li>
              <Link to="/explore?area=Koramangala" className="hover:text-brand transition-colors">
                Koramangala 4th & 5th Block
              </Link>
            </li>
            <li>
              <Link to="/explore?area=HSR+Layout" className="hover:text-brand transition-colors">
                HSR Layout Sectors 1-7
              </Link>
            </li>
            <li>
              <Link to="/explore?area=Whitefield" className="hover:text-brand transition-colors">
                Whitefield & ITPL Main Rd
              </Link>
            </li>
            <li>
              <Link to="/explore?area=Electronic+City" className="hover:text-brand transition-colors">
                Electronic City Phase 1 & 2
              </Link>
            </li>
            <li>
              <Link to="/explore?area=Bellandur" className="hover:text-brand transition-colors">
                Bellandur & Outer Ring Road
              </Link>
            </li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-4">
        <p>© {currentYear} ChargeShare India. Strictly restricted to Bengaluru, Karnataka. Demo/Portfolio project.</p>
        <p className="flex items-center gap-1">
          Crafted with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> for a cleaner Bengaluru.
        </p>
      </div>
    </footer>
  );
};
