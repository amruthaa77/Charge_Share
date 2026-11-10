import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO';
import { ShieldCheck, Image, Camera, ArrowLeft } from 'lucide-react';
import { BAY_IMAGES, BAY_THUMBNAILS } from '../constants/bayImages';

export const CreditsPage = () => {
  const creditsList = [
    {
      id: 'bay-1',
      title: 'Ather 340 & Ather 450 Seated Scooter',
      file: 'Ather 340 & Ather 450 electric scooters launched___.jpg',
      hero: BAY_IMAGES[0],
      thumb: BAY_THUMBNAILS[0],
      description: 'White electric scooter charging from wall-mounted residential socket.',
    },
    {
      id: 'bay-2',
      title: 'Ather 450X Gen 3 Villa Wallbox',
      file: 'Ather 450X Gen 3 With Extended Range, Improved Features Launched_ Price.jpg',
      hero: BAY_IMAGES[1],
      thumb: BAY_THUMBNAILS[1],
      description: 'Matte-grey Ather 450X parked on driveway charging with ivy wall backdrop.',
    },
    {
      id: 'bay-3',
      title: 'Bengaluru Ather Grid Public Kiosk',
      file: 'ather charging.jpg',
      hero: BAY_IMAGES[2],
      thumb: BAY_THUMBNAILS[2],
      description: 'Authentic Bengaluru pavement charging kiosk with dual high-speed pillars.',
    },
    {
      id: 'bay-4',
      title: 'Outdoor Public Green Charging Bollard',
      file: 'Barcelona impulsa estaciones mixtas para cargar coches y motos eléctricas.jpg',
      hero: BAY_IMAGES[3],
      thumb: BAY_THUMBNAILS[3],
      description: 'Electric scooter connected to green public charging station.',
    },
    {
      id: 'bay-5',
      title: 'Chalo Smart Eco Seated Scooter',
      file: 'CHALO SMART ECO.jpg',
      hero: BAY_IMAGES[4],
      thumb: BAY_THUMBNAILS[4],
      description: 'Futuristic white and lime-green electric scooter in architectural tunnel.',
    },
    {
      id: 'bay-6',
      title: 'Ola S1 Pro Signature Twin-Ring LED',
      file: 'Check out Ola electric scooter in detailed images_ Does Ather 450X have an anticipated contender__.jpg',
      hero: BAY_IMAGES[5],
      thumb: BAY_THUMBNAILS[5],
      description: 'All-black Ola S1 Pro with glowing twin-ring headlights in dark studio.',
    },
    {
      id: 'bay-7',
      title: 'Heavy-Duty Commercial Delivery Scooter',
      file: 'Ev scooty.jpg',
      hero: BAY_IMAGES[6],
      thumb: BAY_THUMBNAILS[6],
      description: 'Navy blue utility electric scooter with crash guards on double stand.',
    },
    {
      id: 'bay-8',
      title: 'Honda Activa EV Concept Stage',
      file: 'Honda Activa EV_ A New Era of Electric Mobility in India.jpg',
      hero: BAY_IMAGES[7],
      thumb: BAY_THUMBNAILS[7],
      description: 'Pearl white concept electric scooter with ambient blue backlighting.',
    },
    {
      id: 'bay-9',
      title: 'Modern EV Industrial Design Profile',
      file: 'The Industrial Design Evolution of Modern EV Scooters.jpg',
      hero: BAY_IMAGES[8],
      thumb: BAY_THUMBNAILS[8],
      description: 'Minimalist matte-black electric scooter profile.',
    },
    {
      id: 'bay-10',
      title: 'Ather 450X Gated Society Driveway',
      file: "The impact of government subsidies on  EV's.jpg",
      hero: BAY_IMAGES[9],
      thumb: BAY_THUMBNAILS[9],
      description: 'Wide-angle residential charging port in Bengaluru residential community.',
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary selection:bg-brand/20 selection:text-brand transition-colors antialiased">
      <SEO
        title="Asset Credits & Image Attribution"
        description="Photography credits and visual asset attribution for ChargeShare India."
        canonical="/credits"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        {/* Navigation & Header */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-brand transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to ChargeShare Home</span>
          </Link>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand/10 text-brand border border-brand/20">
              <Camera className="w-3.5 h-3.5" />
              <span>Asset Attribution Registry</span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Image Credits & Usage Rights
            </h1>
            <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
              ChargeShare India exclusively features electric two-wheeler photography representing Bengaluru’s community charging ecosystem.
            </p>
          </div>
        </div>

        {/* Legal & Ownership Statement Notice */}
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-brand/20 shadow-luxury-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 text-xs text-text-secondary leading-relaxed">
            <h3 className="font-editorial font-bold text-base text-text-primary">
              Project Owner Usage Rights Confirmation
            </h3>
            <p className="font-medium text-text-primary">
              &ldquo;Images supplied by the project owner; owner confirms usage rights.&rdquo;
            </p>
            <p className="text-[11px] text-text-muted">
              All bay photographs shown across listings and search cards are curated assets provided by the platform owner for application demonstration and grid operations. Upstream licenses and photographic attributions are managed directly by the platform owner.
            </p>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="space-y-4">
          <h2 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
            <Image className="w-5 h-5 text-brand" />
            <span>Curated Electric Two-Wheeler Bay Photography (10 Assets)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {creditsList.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl bg-surface border border-border shadow-luxury-sm overflow-hidden flex flex-col transition-all hover:border-brand/40"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-bg-soft relative">
                  <img
                    src={item.hero}
                    alt={item.title}
                    width={1200}
                    height={675}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                    {item.id}
                  </div>
                </div>

                <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-editorial font-bold text-sm text-text-primary leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-text-secondary leading-relaxed mt-1">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border/60 text-[10px] text-text-muted font-mono truncate">
                    File: {item.file}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Vector Fallback Card */}
        <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-3">
          <h3 className="font-editorial font-bold text-base text-text-primary">
            Neutral Platform Fallback Asset
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            In the event of network disruption or missing photography, the platform serves{' '}
            <code className="text-brand font-mono font-semibold">/images/bay-fallback.svg</code>, a proprietary, lightweight (&lt; 5 KB) vector illustration of a 16A electric scooter charging socket rendered with ChargeShare India design tokens.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreditsPage;
