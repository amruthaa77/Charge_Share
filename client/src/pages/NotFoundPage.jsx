import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO';
import { Home, MapPin, LifeBuoy } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-16 px-4 text-center bg-bg text-text-primary transition-colors">
      <SEO
        title="404 - Bay Not Found — ChargeShare Bengaluru"
        description="The requested EV two-wheeler charging page or socket could not be located in Bengaluru."
      />

      <div className="max-w-md w-full space-y-6 p-8 sm:p-10 rounded-4xl bg-surface border border-border shadow-luxury-md backdrop-blur-md">
        {/* Custom EV Battery Depleted SVG Graphic */}
        <div className="w-24 h-24 mx-auto relative flex items-center justify-center">
          <svg
            className="w-full h-full text-brand/20"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect
              x="20"
              y="30"
              width="60"
              height="40"
              rx="8"
              stroke="currentColor"
              strokeWidth="4"
              strokeOpacity="0.4"
            />
            <path
              d="M84 43C85.5 43 87 44.5 87 46V54C87 55.5 85.5 57 84 57"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity="0.4"
            />
            <rect
              x="28"
              y="38"
              width="14"
              height="24"
              rx="3"
              className="fill-rose-500 animate-pulse"
            />
            <path
              d="M48 38L52 48H44L48 62"
              stroke="#EF4444"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <div className="font-editorial text-5xl font-bold text-text-primary tracking-tight">404</div>
          <h1 className="font-editorial text-2xl font-bold text-text-primary mt-2">
            Socket Out of Network
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed mt-2 max-w-sm mx-auto">
            The charging bay, booking pass, or page you were looking for is unavailable or outside our Bengaluru two-wheeler grid.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 pt-2">
          <Link
            to="/"
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-bg border border-border hover:bg-bg-raised text-text-primary font-bold text-xs transition-colors flex items-center gap-1.5 touch-target-min"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <Link
            to="/explore"
            className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand hover:brightness-110 text-brand-contrast font-bold text-xs transition-colors shadow-luxury-sm flex items-center gap-1.5 touch-target-min"
          >
            <MapPin className="w-3.5 h-3.5 text-white" />
            <span>Bengaluru Map</span>
          </Link>
          <Link
            to="/help"
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-bg border border-border hover:bg-bg-raised text-text-primary font-bold text-xs transition-colors flex items-center gap-1.5 touch-target-min"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Help Desk</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
