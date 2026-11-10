import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { RealisticCharger3D } from '../components/3d/RealisticCharger3D';
import {
  Zap,
  MapPin,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  Lock,
  ArrowRight,
  Star,
  Search,
  Clock,
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const heroWrapperRef = useRef(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [pageReady, setPageReady] = useState(false);

  // Coordinate First Paint (Wait for fonts ready with 600ms safety timeout)
  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      if (isMounted) setPageReady(true);
    }, 600);

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (isMounted) setPageReady(true);
      });
    } else {
      setPageReady(true);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // Setup Lenis Smooth Scroll + GSAP ScrollTrigger Pinned Timeline
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !isTouchDevice,
      syncTouch: false,
    });

    lenis.on('scroll', ScrollTrigger.update);
    const tickerFn = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    const heroEl = heroWrapperRef.current;
    if (!heroEl) return;

    const isMobile = window.innerWidth < 768;
    const pinTrigger = ScrollTrigger.create({
      trigger: heroEl,
      start: 'top top',
      end: isMobile ? '+=250%' : '+=380%',
      pin: true,
      pinSpacing: true,
      scrub: 0.6,
      anticipatePin: 1,
      onUpdate: (self) => {
        setCurrentProgress(self.progress);
      },
    });

    return () => {
      pinTrigger.kill();
      lenis.destroy();
      gsap.ticker.remove(tickerFn);
    };
  }, []);

  // Host earnings calculator state (Bengaluru 16A Two-Wheeler Focus)
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [ratePerKWh, setRatePerKWh] = useState(14);
  const chargerKW = 3.3; // 16A Indian Standard Single-Phase Socket (3.3 kW)

  // FAQ state
  const [openFaq, setOpenFaq] = useState(null);

  const handleAreaSelect = (areaName) => {
    navigate(`/explore?area=${encodeURIComponent(areaName)}`);
  };

  // Host monthly earnings calculation
  const dailyKWh = Math.round(chargerKW * hoursPerDay * 0.8);
  const monthlyEarnings = Math.round(dailyKWh * ratePerKWh * 30);

  const projectionData = [
    { day: 'Day 5', earnings: Math.round(monthlyEarnings * 0.16) },
    { day: 'Day 10', earnings: Math.round(monthlyEarnings * 0.33) },
    { day: 'Day 15', earnings: Math.round(monthlyEarnings * 0.5) },
    { day: 'Day 20', earnings: Math.round(monthlyEarnings * 0.67) },
    { day: 'Day 25', earnings: Math.round(monthlyEarnings * 0.83) },
    { day: 'Day 30', earnings: monthlyEarnings },
  ];

  const bengaluruCorridors = [
    { name: 'Indiranagar', bays: '28 Bays', sockets: '16A & Bharat AC' },
    { name: 'Koramangala', bays: '34 Bays', sockets: '16A Sockets' },
    { name: 'HSR Layout', bays: '22 Bays', sockets: 'Society Garages' },
    { name: 'Whitefield', bays: '41 Bays', sockets: 'Tech Park Adjacent' },
    { name: 'Bellandur ORR', bays: '19 Bays', sockets: 'Commercial & Home' },
    { name: 'Electronic City', bays: '25 Bays', sockets: 'Apartment Bays' },
  ];

  const faqs = [
    {
      q: 'Why is ChargeShare exclusively focused on Bengaluru electric two-wheelers?',
      a: 'Bengaluru is India’s EV capital with over 350,000 electric two-wheelers (Ather, Ola, TVS, Chetak). Most riders carry standard portable chargers that plug into heavy-duty 16A 3-pin domestic sockets. We unlock idle home, shop, and apartment sockets so riders never face range anxiety.',
    },
    {
      q: 'Which electric scooters and bikes are compatible?',
      a: 'All Indian market electric two-wheelers with standard 16A plugs or Bharat AC-001 sockets are 100% compatible: Ather 450X & 450S, Ola S1 Pro & Air, TVS iQube, Bajaj Chetak, Hero Vida V1, Simple One, River Indie, and Ultraviolette F77.',
    },
    {
      q: 'How does double-booking prevention work on ChargeShare?',
      a: 'We implement discrete time-slot modeling with database-level partial unique indexes on (chargerId, slotStart). When you pick a slot, it is held exclusively for 10 minutes while you complete payment. Even under concurrent high traffic, race conditions are blocked by MongoDB atomic constraints with HTTP 409 friendly conflict handling.',
    },
    {
      q: 'How are host sockets safety-verified for earthing?',
      a: 'Every host listing requires submission of physical earthing verification (measuring <5V between neutral and earth), a 16A dedicated miniature circuit breaker (MCB), and electricity bill / society NOC before being activated on the map.',
    },
    {
      q: 'What is Emergency SOS charging?',
      a: 'When your battery drops below 15% in Bengaluru traffic, activate Emergency SOS to immediately bypass slot scheduling and navigate to the nearest active 16A socket with 1-tap host alerting and prioritized bay access.',
    },
    {
      q: 'What is the host cancellation and payout schedule?',
      a: 'Hosts receive automated direct bank transfers (Razorpay Routes) weekly. Cancellations made by riders 2+ hours prior are fully refunded; cancellations within 2 hours grant the host 50% payout compensation.',
    },
  ];

  const testimonials = [
    {
      quote:
        'I ride an Ather 450X from Whitefield to Indiranagar daily. Booking a dedicated 16A socket in a residential society saved me from getting stranded multiple times.',
      author: 'Rohit Kulkarni',
      role: 'Ather 450X Commuter • Indiranagar',
      scooter: 'Ather 450X',
      rating: 5,
    },
    {
      quote:
        'Our apartment society basement in HSR Layout had 4 idle 16A outdoor sockets. Listing them on ChargeShare generates ₹18,500 every month for our common fund.',
      author: 'Pooja Venkatesh',
      role: 'Society Committee Host • HSR Layout',
      scooter: 'Host Partner',
      rating: 5,
    },
    {
      quote:
        'Charges my Ola S1 Pro while I work at a café in Koramangala 4th Block. The 10-minute slot reservation lock and instant host WhatsApp link are unmatched.',
      author: 'Kavya Raman',
      role: 'Ola S1 Pro Owner • Koramangala',
      scooter: 'Ola S1 Pro',
      rating: 5,
    },
  ];

  return (
    <div className="relative bg-bg text-text-primary transition-colors overflow-clip">
      {/* =========================================================================
          HERO SCROLLYTELLING CONTAINER (PINNED 100SVH WITH GSAP SCROLLTRIGGER)
          ========================================================================= */}
      <section
        ref={heroWrapperRef}
        className={`relative h-[100svh] min-h-[clamp(340px,100dvh,600px)] w-full overflow-hidden flex flex-col justify-center items-center bg-mint-radial transition-opacity duration-250 ${
          pageReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Subtle Background Radial & Grid Pattern */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none opacity-30" />

        {/* 3D WebGL Wallbox & Connector Canvas */}
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-visible">
          <RealisticCharger3D progress={currentProgress} className="w-full h-full max-w-6xl" />
        </div>

        {/* SCENE 1: HERO REVEAL (Progress: 0.00 - 0.12) */}
        <div
          className={`absolute inset-0 z-20 flex flex-col items-center justify-between p-6 sm:p-12 transition-all duration-500 ${
            currentProgress < 0.12
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {/* Top pill badge */}
          <div className="pt-6 sm:pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-translucent backdrop-blur-md border border-border shadow-luxury text-text-primary text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-brand led-pulse-ring" />
              <span>Bengaluru Electric Two-Wheeler Community</span>
            </div>
          </div>

          {/* Giant Centered Editorial Typography */}
          <div className="text-center my-auto px-4 max-w-5xl min-h-[clamp(3.5rem,15vw,16rem)] flex flex-col justify-center items-center">
            <h1 className="font-editorial text-[clamp(2.75rem,15vw,14rem)] font-bold tracking-tight text-text-primary leading-[0.88] select-none h-[clamp(2.75rem,15vw,14rem)] flex items-center justify-center">
              CHARGE
            </h1>
            <p className="mt-3 text-sm sm:text-lg font-medium text-text-secondary max-w-xl mx-auto tracking-normal">
              Bengaluru&apos;s verified peer-to-peer charging network for electric scooters & bikes.
            </p>
          </div>

          {/* Bottom Actions & Scroll cue */}
          <div className="pb-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <Link
                to="/explore"
                className="px-6 py-3 min-h-[44px] rounded-2xl bg-brand text-brand-contrast font-semibold text-xs sm:text-sm hover:brightness-110 transition-all shadow-luxury flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-brand-contrast" />
                <span>Find 16A Bays</span>
              </Link>
              <Link
                to="/become-a-host"
                className="px-6 py-3 min-h-[44px] rounded-2xl bg-surface text-text-primary font-semibold text-xs sm:text-sm hover:bg-bg-raised border border-border transition-all shadow-luxury-sm flex items-center"
              >
                <span>List Your Socket</span>
              </Link>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted animate-bounce pt-1">
              <ChevronDown className="w-4 h-4" />
              <span>Scroll to explore the hardware</span>
            </div>
          </div>
        </div>

        {/* SCENE 2: PRODUCT DROP & CIRCUIT REVEAL (Progress: 0.12 - 0.32) */}
        <div
          className={`absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-16 transition-all duration-500 pointer-events-none ${
            currentProgress >= 0.12 && currentProgress < 0.32
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="max-w-md pt-8 sm:pt-14">
            <span className="px-3 py-1 rounded-full bg-brand/10 text-brand font-bold text-xs uppercase tracking-wider border border-brand/20">
              Scene 02 • Precision Architecture
            </span>
            <h2 className="font-editorial text-2xl sm:text-4xl font-bold text-text-primary mt-3 leading-tight">
              Engineered for 16A Indian domestic outlets.
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-text-secondary leading-relaxed">
              Single-phase 3.3 kW heavy-duty power bus. Dedicated copper earthing bus bar and dual-pole miniature circuit breakers (MCB) ensure 100% surge safety for your Ather or Ola battery pack.
            </p>
          </div>

          {/* Floating Annotation Callout */}
          <div className="self-end max-w-xs p-4 rounded-2xl bg-surface/90 backdrop-blur-md border border-border shadow-luxury mb-8">
            <div className="flex items-center gap-2 text-xs font-bold text-brand mb-1">
              <ShieldCheck className="w-4 h-4 text-brand" />
              <span>Dedicated Earthing Verification</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every socket is tested with neutral-to-earth potential under 5V before appearing on the map.
            </p>
          </div>
        </div>

        {/* SCENE 3: TWO DISTINCT COLUMNS: TEXT & CTAs ON LEFT, CHARGER 3D ON RIGHT (Progress: 0.32 - 0.50) */}
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center px-6 sm:px-12 lg:px-20 transition-all duration-500 ${
            currentProgress >= 0.32 && currentProgress < 0.50
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Text & CTAs */}
            <div className="lg:col-span-6 bg-surface/90 backdrop-blur-xl p-6 sm:p-10 rounded-3xl border border-border shadow-luxury-xl text-left space-y-4">
              <span className="inline-block px-3.5 py-1 rounded-full bg-brand/10 text-brand font-semibold text-xs tracking-wide border border-brand/20">
                Scene 03 • Smart Bengaluru Socket
              </span>
              <h2 className="font-editorial text-2xl sm:text-4xl font-bold text-text-primary leading-tight">
                Charge anywhere in Bengaluru. <br />
                Earn from your socket.
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Turn your home parking spot, shop entrance, or apartment socket into a reliable charging bay for Bengaluru’s electric two-wheeler riders.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/explore"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand text-brand-contrast font-bold text-xs hover:brightness-110 transition-all shadow-luxury-sm flex items-center justify-center touch-target-min"
                >
                  Find Charging Sockets
                </Link>
                <Link
                  to="/become-a-host"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-surface text-text-primary border border-border font-bold text-xs hover:bg-bg-raised transition-all flex items-center justify-center touch-target-min"
                >
                  Monetize Socket
                </Link>
              </div>
            </div>
            {/* Right Column: Space reserved for 3D Charger */}
            <div className="hidden lg:block lg:col-span-6 pointer-events-none" />
          </div>
        </div>

        {/* SCENE 4: 4 CIRCULAR FLOATING CALLOUTS WITH CONNECTOR LINES (Progress: 0.50 - 0.72) */}
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center p-6 transition-all duration-500 pointer-events-none ${
            currentProgress >= 0.50 && currentProgress < 0.72
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-90'
          }`}
        >
          <div className="relative w-full max-w-4xl h-[480px]">
            {/* Hairline connector SVG lines linking badges to center */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="20%" y1="20%" x2="45%" y2="45%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-brand" />
              <line x1="80%" y1="20%" x2="55%" y2="45%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-brand" />
              <line x1="20%" y1="80%" x2="45%" y2="55%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-brand" />
              <line x1="80%" y1="80%" x2="55%" y2="55%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-brand" />
            </svg>

            {/* Badge 1: Top Left */}
            <div className="absolute top-4 left-4 sm:left-12 max-w-[210px] p-4 rounded-3xl bg-surface/90 backdrop-blur-md border border-border shadow-luxury flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">Verified Hosts</h4>
                <p className="text-xs text-text-secondary">Bills & society NOC verified</p>
              </div>
            </div>

            {/* Badge 2: Top Right */}
            <div className="absolute top-4 right-4 sm:right-12 max-w-[210px] p-4 rounded-3xl bg-surface/90 backdrop-blur-md border border-border shadow-luxury flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">Zero Overlaps</h4>
                <p className="text-xs text-text-secondary">10-min atomic slot lock</p>
              </div>
            </div>

            {/* Badge 3: Bottom Left */}
            <div className="absolute bottom-6 left-4 sm:left-12 max-w-[210px] p-4 rounded-3xl bg-surface/90 backdrop-blur-md border border-border shadow-luxury flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">16A Heavy Duty</h4>
                <p className="text-xs text-text-secondary">Standard for Ather, Ola, TVS</p>
              </div>
            </div>

            {/* Badge 4: Bottom Right */}
            <div className="absolute bottom-6 right-4 sm:right-12 max-w-[210px] p-4 rounded-3xl bg-surface/90 backdrop-blur-md border border-border shadow-luxury flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">Bengaluru Grid</h4>
                <p className="text-xs text-text-secondary">Indiranagar to Whitefield</p>
              </div>
            </div>
          </div>
        </div>

        {/* SCENE 5: BENEFITS LIST ON LEFT + CHARGER SHRINKS RIGHT + SMARTPHONE MOCKUP (Progress: 0.72 - 1.00) */}
        <div
          className={`absolute inset-0 z-20 flex items-center justify-between px-6 sm:px-16 lg:px-24 transition-all duration-500 ${
            currentProgress >= 0.72
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {/* Left Column: Editorial Headline, Benefits List & Actions */}
          <div className="max-w-lg space-y-4">
            <span className="px-3.5 py-1 rounded-full bg-brand text-brand-contrast font-semibold text-xs tracking-wider uppercase">
              Scene 05 • The Experience
            </span>
            <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-text-primary leading-[1.08]">
              Find. Book. <br />
              Charge. Ride.
            </h2>
            <p className="text-xs sm:text-base text-text-secondary leading-relaxed">
              Discover guaranteed 16A sockets across Bengaluru in 3 clicks. Instant directions, contactless Razorpay payments, and seamless QR check-in at residential gates.
            </p>

            {/* Benefit Bullet List */}
            <div className="space-y-2 py-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                <span>100% earthing & surge verified before listing</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                <span>10-minute atomic reservation hold locks</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                <span>One-tap Emergency SOS dispatch for critical batteries</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/explore"
                className="px-6 py-3 min-h-[44px] rounded-2xl bg-brand text-brand-contrast font-semibold text-xs sm:text-sm hover:brightness-110 transition-all shadow-luxury flex items-center gap-2 touch-target-min"
              >
                <MapPin className="w-4 h-4 text-brand-contrast" />
                <span>Explore Bengaluru Map</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/become-a-host"
                className="px-6 py-3 min-h-[44px] rounded-2xl bg-surface text-text-primary font-semibold text-xs sm:text-sm hover:bg-bg-raised border border-border transition-all shadow-luxury-sm flex items-center touch-target-min"
              >
                <span>Monetize Your Socket</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Realistic Angled Smartphone Mockup */}
          <div className="hidden lg:block relative w-[310px] h-[580px] rounded-[44px] bg-surface-elevated p-3 shadow-luxury-xl border-4 border-border rotate-2 hover:rotate-0 transition-transform duration-500">
            {/* Dynamic Island Notch */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 rounded-full bg-surface-border z-30 flex items-center justify-end px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
            </div>

            {/* Screen Content: Live ChargeShare Booking Interface */}
            <div className="w-full h-full rounded-[36px] bg-bg overflow-hidden flex flex-col justify-between p-4 text-text-primary pt-9 border border-border">
              {/* Screen Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand" /> Indiranagar 100ft
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-bold">
                    Available Now
                  </span>
                </div>
                <h3 className="font-editorial text-base font-bold text-text-primary">
                  Prestige Jade Bay #2
                </h3>
              </div>

              {/* Scooter & Socket Spec Card */}
              <div className="bg-surface rounded-2xl p-3 border border-border shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">Connector</span>
                  <span className="font-bold text-text-primary">16A 3-Pin Heavy Duty</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">Power Rating</span>
                  <span className="font-bold text-brand">3.3 kW (Verified Earth)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">Vehicle Selected</span>
                  <span className="font-bold text-text-primary">Ather 450X (2.9 kWh)</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                  <span className="text-text-secondary font-medium">Rate</span>
                  <span className="font-extrabold text-brand text-sm">₹14 / hr</span>
                </div>
              </div>

              {/* Simulated Slot Selection */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Select Charging Window
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-brand text-brand-contrast font-semibold text-center border border-brand">
                    14:00 - 15:00
                  </div>
                  <div className="p-2 rounded-xl bg-surface text-text-primary font-medium text-center border border-border">
                    15:00 - 16:00
                  </div>
                </div>
              </div>

              {/* Simulated Book Button */}
              <button
                type="button"
                onClick={() => navigate('/explore')}
                className="w-full py-2.5 rounded-xl bg-brand text-brand-contrast font-bold text-xs hover:opacity-90 transition-opacity shadow-luxury-sm flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Reserve 16A Bay (10m Lock)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION A: HOW IT WORKS (STRICT TWO-WHEELER FOCUS)
          ========================================================================= */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="px-3.5 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand font-bold text-xs uppercase tracking-wider">
            Simple 3-Step Flow
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-text-primary mt-4">
            How ChargeShare powers your ride.
          </h2>
          <p className="mt-3 text-xs sm:text-base text-text-secondary">
            Engineered around portable chargers carried by Ather, Ola, TVS, and Chetak riders across Bengaluru.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Step 1 */}
          <div className="bg-surface p-8 rounded-3xl border border-border shadow-luxury-sm flex flex-col justify-between">
            <div>
              <span className="font-editorial text-5xl font-bold text-text-muted/30 block mb-4">01</span>
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-6 text-brand">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-text-primary mb-2">
                Discover Verified Bays
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Filter by verified 16A 3-pin sockets, live availability, earthing status, and distance across Indiranagar, Koramangala, and HSR Layout.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs font-semibold text-brand">
              <CheckCircle2 className="w-4 h-4" /> <span>500+ Verified Bengaluru Outlets</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-surface p-8 rounded-3xl border border-border shadow-luxury-sm flex flex-col justify-between">
            <div>
              <span className="font-editorial text-5xl font-bold text-text-muted/30 block mb-4">02</span>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-cyan-600 dark:text-cyan-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-text-primary mb-2">
                Lock Your 10-Min Slot
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Atomic database constraints guarantee zero double-bookings. Pay seamlessly via UPI, card, or netbanking with instant receipt & gate pass.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              <CheckCircle2 className="w-4 h-4" /> <span>Atomic Double-Booking Protection</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-surface p-8 rounded-3xl border border-border shadow-luxury-sm flex flex-col justify-between">
            <div>
              <span className="font-editorial text-5xl font-bold text-text-muted/30 block mb-4">03</span>
              <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-6 text-brand">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-text-primary mb-2">
                Plug In & Ride Ahead
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Scan QR at the host’s garage or society gate, plug in your portable charger, and track session status in real-time.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border flex items-center gap-2 text-xs font-semibold text-brand">
              <CheckCircle2 className="w-4 h-4" /> <span>Real-Time Session Tracking</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION B: BENGALURU TECH CORRIDORS MAP TEASER
          ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="surface-dark rounded-4xl p-8 sm:p-14 lg:p-16 relative overflow-hidden shadow-luxury-xl">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand/20 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-6 space-y-4">
              <span className="px-3 py-1 rounded-full bg-white/10 text-white font-bold text-xs uppercase tracking-wider">
                Bengaluru Geofenced
              </span>
              <h2 className="font-editorial text-3xl sm:text-5xl font-bold leading-tight text-white">
                Charging hubs across your daily Bengaluru commute.
              </h2>
              <p className="text-white/80 text-xs sm:text-base leading-relaxed">
                From Outer Ring Road tech corridors to Central Business District cafes. Find active 16A two-wheeler bays stationed near offices and societies.
              </p>

              <div className="pt-2">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand text-brand-contrast font-bold text-xs sm:text-sm hover:opacity-90 transition-all shadow-luxury"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Launch Live Bengaluru Map</span>
                </Link>
              </div>
            </div>

            {/* Quick Corridor Selector Cards */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bengaluruCorridors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleAreaSelect(c.name)}
                  className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-left transition-all hover:scale-[1.02] flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-contrast transition-colors">
                      {c.name}
                    </h4>
                    <p className="text-xs text-white/70">{c.sockets}</p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-brand/30 text-white text-xs font-semibold">
                    {c.bays}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION C: HOST EARNINGS CALCULATOR
          ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Sliders & Controls */}
          <div className="lg:col-span-6 space-y-6">
            <span className="px-3.5 py-1 rounded-full bg-brand/10 text-brand font-bold text-xs uppercase tracking-wider border border-brand/20">
              Host Monetization
            </span>
            <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-text-primary leading-tight">
              Turn your outdoor socket into monthly passive income.
            </h2>
            <p className="text-text-secondary text-xs sm:text-base leading-relaxed">
              Have an idle 16A 3-pin socket in your parking garage, driveway, or commercial shop front? Rent it out when you’re away at work.
            </p>

            <div className="bg-surface p-6 rounded-3xl border border-border shadow-luxury-sm space-y-6">
              {/* Slider 1: Hours Rented / Day */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="hoursRange" className="text-xs font-bold text-text-primary">
                    Hours Available Per Day
                  </label>
                  <span className="text-sm font-extrabold text-brand">{hoursPerDay} hours / day</span>
                </div>
                <input
                  id="hoursRange"
                  type="range"
                  min="2"
                  max="16"
                  step="1"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Slider 2: Rate Per kWh */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="rateRange" className="text-xs font-bold text-text-primary">
                    Rate Per kWh (Electricity + Markup)
                  </label>
                  <span className="text-sm font-extrabold text-brand">₹{ratePerKWh} / kWh</span>
                </div>
                <input
                  id="rateRange"
                  type="range"
                  min="10"
                  max="25"
                  step="1"
                  value={ratePerKWh}
                  onChange={(e) => setRatePerKWh(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-text-secondary border-t border-border">
                <span>Estimated power: 3.3 kW (16A 3-Pin)</span>
                <span>BESCOM base tariff: ~₹7.50 / kWh</span>
              </div>
            </div>
          </div>

          {/* Right Column: Earnings Projection Display & Chart */}
          <div className="lg:col-span-6">
            <div className="bg-surface p-8 rounded-4xl border border-border shadow-luxury-lg space-y-6">
              <div>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">
                  Projected Monthly Earnings
                </span>
                <div className="font-editorial text-5xl sm:text-6xl font-extrabold text-brand mt-2">
                  ₹{monthlyEarnings.toLocaleString('en-IN')}
                  <span className="text-sm font-normal text-text-secondary ml-2">/ month</span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Based on ~{dailyKWh} kWh daily consumption over 30 billing days.
                </p>
              </div>

              {/* 30-Day Projection Recharts Area */}
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      formatter={(val) => [`₹${val}`, 'Projected Revenue']}
                      contentStyle={{
                        borderRadius: '0.875rem',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#10B981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#chartGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-2">
                <Link
                  to="/become-a-host"
                  className="w-full py-3.5 rounded-2xl bg-brand hover:opacity-90 text-brand-contrast font-semibold text-xs sm:text-sm transition-all shadow-luxury flex items-center justify-center gap-2"
                >
                  <span>Start Hosting Your Socket Today</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION D: SAFETY & TRUST ARCHITECTURE
          ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="px-3.5 py-1 rounded-full bg-brand/10 text-brand font-bold text-xs uppercase tracking-wider border border-brand/20">
            Trust & Safety
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-text-primary mt-4">
            Zero compromises on battery & property safety.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Verified Earthing & MCB
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Hosts verify grounding potential before approval. Ensures that transient voltage spikes never damage your two-wheeler BMS (Battery Management System).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Property & Society Consent
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every apartment socket listing requires formal verification: BESCOM utility bills and apartment RWA / society No-Objection Certificates (NOC).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Exclusive 10-Min Reservation Hold
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              No arrival disputes. Slots are locked atomically for 10 minutes upon selection, ensuring nobody books the bay while you are en route.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION E: TESTIMONIALS
          ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="px-3.5 py-1 rounded-full bg-brand/10 text-brand font-bold text-xs uppercase tracking-wider border border-brand/20">
            Community Voices
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-text-primary mt-4">
            Riders & hosts loving ChargeShare.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-text-primary italic leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{t.author}</h4>
                  <p className="text-xs text-text-secondary">{t.role}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-bold">
                  {t.scooter}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION F: FAQS ACCORDION
          ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-text-primary">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-2">
            Everything you need to know about charging in Bengaluru.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl bg-surface border border-border overflow-hidden transition-all shadow-luxury-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-text-primary hover:text-brand transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-brand' : 'text-text-muted'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION G: FINAL LUXURY CTA BANNER
          ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="surface-dark rounded-4xl text-white p-10 sm:p-16 text-center relative overflow-hidden shadow-luxury-xl">
          <div className="max-w-2xl mx-auto relative z-10 space-y-5">
            <span className="px-3.5 py-1 rounded-full bg-brand/20 text-white font-bold text-xs uppercase tracking-wider">
              Ready to Ride Electric?
            </span>
            <h2 className="font-editorial text-3xl sm:text-5xl font-bold leading-tight text-white">
              Power your two-wheeler anywhere in Bengaluru.
            </h2>
            <p className="text-white/80 text-xs sm:text-base max-w-lg mx-auto">
              Join thousands of Ather, Ola, and TVS commuters enjoying seamless, reserved charging sockets.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                to="/explore"
                className="px-8 py-3.5 rounded-2xl bg-brand text-brand-contrast font-bold text-xs sm:text-sm transition-all shadow-luxury hover:opacity-90"
              >
                Find Charging Sockets Now
              </Link>
              <Link
                to="/become-a-host"
                className="px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm transition-all"
              >
                List Your Socket
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
