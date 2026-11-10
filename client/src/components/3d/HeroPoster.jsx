import React from 'react';

/**
 * HeroPoster
 * High-performance vector poster of the 16A heavy-duty connector rendered on paint 0.
 * Eliminates 3D pop-in by perfectly occupying the canvas space before WebGL hydration.
 */
export const HeroPoster = ({ className = '', style = {} }) => {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none transition-opacity duration-300 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 800 600"
        className="w-full h-full max-w-4xl max-h-[75vh] object-contain drop-shadow-2xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Ambient Radial Glow */}
          <radialGradient id="posterGlow" cx="55%" cy="50%" r="40%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>

          {/* Plug Rubber Chassis Gradient */}
          <linearGradient id="plugBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="45%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Grip Bezel Gradient */}
          <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#064E3B" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>

          {/* Brass Pin Gradient */}
          <linearGradient id="brassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Cable Gradient */}
          <linearGradient id="cableGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="70%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#05080E" />
          </linearGradient>
        </defs>

        {/* Emerald Ambient Light Field */}
        <circle cx="520" cy="310" r="180" fill="url(#posterGlow)" />

        {/* Cable Path curving into camera depth */}
        <path
          d="M 450 340 C 410 390, 360 450, 480 520"
          stroke="url(#cableGrad)"
          strokeWidth="24"
          strokeLinecap="round"
        />

        {/* Plug Main Cylinder Body (Angled 3D Isometric View) */}
        <g transform="translate(430, 240) rotate(15)">
          {/* Plug Body Shadow */}
          <ellipse cx="65" cy="85" rx="55" ry="32" fill="#000000" fillOpacity="0.25" />

          {/* Heavy Duty Cylindrical Housing */}
          <rect x="10" y="25" width="110" height="75" rx="20" fill="url(#plugBodyGrad)" />
          <ellipse cx="65" cy="25" rx="55" ry="22" fill="#334155" />
          <ellipse cx="65" cy="100" rx="55" ry="22" fill="#0F172A" />

          {/* Ergonomic Ring Accent */}
          <rect x="8" y="55" width="114" height="12" rx="4" fill="url(#bezelGrad)" />

          {/* Brass Connector Pins */}
          {/* Earth Pin (Top center, heavier gauge) */}
          <rect x="58" y="-18" width="14" height="32" rx="6" fill="url(#brassGrad)" />
          <ellipse cx="65" cy="-18" rx="7" ry="3" fill="#FEF3C7" />

          {/* Live Pin (Bottom left) */}
          <rect x="36" y="-8" width="11" height="26" rx="5" fill="url(#brassGrad)" />
          <ellipse cx="41.5" cy="-8" rx="5.5" ry="2.5" fill="#FEF3C7" />

          {/* Neutral Pin (Bottom right) */}
          <rect x="82" y="-8" width="11" height="26" rx="5" fill="url(#brassGrad)" />
          <ellipse cx="87.5" cy="-8" rx="5.5" ry="2.5" fill="#FEF3C7" />

          {/* Subtle Green LED Pulse Ring reflection */}
          <circle cx="65" cy="61" r="3.5" fill="#10B981" />
        </g>
      </svg>
    </div>
  );
};
