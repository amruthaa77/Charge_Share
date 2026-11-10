import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { chargerAPI, bookingAPI, vehicleAPI, paymentAPI, reviewAPI, api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { SEO } from '../components/common/SEO';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { DataErrorState } from '../components/common/DataErrorState';
import { normalizeCharger } from '../utils/normalizeCharger';
import { getErrorMessage } from '../utils/errorMapper';
import { BayImage } from '../components/common/BayImage';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import {
  Zap,
  MapPin,
  Clock,
  ShieldCheck,
  Calendar,
  Bike,
  CheckCircle2,
  AlertCircle,
  Star,
  ChevronLeft,
  Share2,
  Lock,
  Navigation,
  CalendarPlus,
  AlertTriangle,
  Phone,
  Flag,
} from 'lucide-react';

export const ChargerDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [charger, setCharger] = useState(null);
  const [liveStatusData, setLiveStatusData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileBookingSheetOpen, setMobileBookingSheetOpen] = useState(false);

  // Report Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('BROKEN_HARDWARE');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/chargers/${id}` } } });
      return;
    }
    if (!reportDescription || reportDescription.trim().length < 10) {
      toast.error('Please describe the issue in at least 10 characters.');
      return;
    }
    try {
      setIsSubmittingReport(true);
      await api.post('/reports', {
        chargerId: id,
        reason: reportReason,
        description: reportDescription,
      });
      toast.success('Thank you for reporting this bay. Our safety and verification team has logged your report.');
      setShowReportModal(false);
      setReportDescription('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Booking Mode: 'INSTANT' (default) | 'EMERGENCY' | 'RESERVE'
  const initialMode = searchParams.get('mode') === 'emergency' ? 'EMERGENCY' : 'INSTANT';
  const [bookingMode, setBookingMode] = useState(initialMode);

  // Flexible duration selection (minutes)
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Advance Reservation state (optional)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Emergency SOS state
  const [batteryPercent, setBatteryPercent] = useState(10);
  const [emergencyNote, setEmergencyNote] = useState('');

  // Booking Flow State
  const [isHolding, setIsHolding] = useState(false);
  const [heldBooking, setHeldBooking] = useState(null);
  const [holdRemainingSeconds, setHoldRemainingSeconds] = useState(600);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [errorState, setErrorState] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Countdown timer for held booking
  useEffect(() => {
    let timer;
    if (heldBooking && holdRemainingSeconds > 0) {
      timer = setInterval(() => {
        setHoldRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setHeldBooking(null);
            setErrorState({
              title: 'Hold Expired',
              message: 'Your 10-minute hold expired. Please select the slot again.',
              code: 'HOLD_EXPIRED',
              retryable: true,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [heldBooking, holdRemainingSeconds]);

  // Fetch Charger details & reviews
  const fetchDetails = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await chargerAPI.getOne(id);
      const normalized = normalizeCharger(res?.data?.charger);
      setCharger(normalized || res?.data?.charger);
      if (res?.data?.charger?.liveDetails) {
        setLiveStatusData(res.data.charger.liveDetails);
      }

      const revRes = await reviewAPI.getChargerReviews(id);
      setReviews(revRes.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch charger', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id]);

  // Real-time Live Status Polling
  useEffect(() => {
    if (!id) return;
    const pollLiveStatus = async () => {
      try {
        const res = await chargerAPI.getLiveStatus(id);
        setLiveStatusData(res.data);
      } catch {
        // quiet check
      }
    };

    pollLiveStatus();
    const interval = setInterval(pollLiveStatus, 10000);
    return () => clearInterval(interval);
  }, [id]);

  // Fetch user vehicles if logged in
  useEffect(() => {
    if (isAuthenticated) {
      vehicleAPI.getMyVehicles().then((res) => {
        setVehicles(res.data.vehicles || []);
        if (res.data.vehicles?.length > 0) {
          const defaultV = res.data.vehicles.find((v) => v.isDefault) || res.data.vehicles[0];
          setSelectedVehicle(defaultV._id);
        }
      });
    }
  }, [isAuthenticated]);

  // Fetch advance slots when in RESERVE mode
  useEffect(() => {
    if (bookingMode !== 'RESERVE') return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await chargerAPI.getAvailability(id, selectedDate);
        setAvailableSlots(res.data.slots || []);
        setSelectedSlot(null);
      } catch (err) {
        console.error('Failed to load slots', err);
      } finally {
        setSlotsLoading(false);
      }
    };

    if (id && selectedDate) {
      fetchSlots();
    }
  }, [id, selectedDate, bookingMode]);

  // Pricing calculation
  const durationHours = durationMinutes / 60;
  const baseRate = charger?.price || 14;
  const estimatedUnits =
    charger?.pricingType === 'PER_HOUR'
      ? durationHours
      : Math.round((charger?.powerKW || 3.3) * durationHours * 0.85);

  const baseAmount =
    charger?.pricingType === 'PER_HOUR'
      ? Math.round(baseRate * durationHours)
      : Math.round(baseRate * Math.max(1, estimatedUnits));

  const platformFee = Math.round(baseAmount * 0.05);
  const totalAmount = baseAmount + platformFee;

  // Single canonical two-wheeler bay image
  const bayPhoto = useMemo(() => {
    return charger?.image || (charger?.photos && charger.photos[0]) || '';
  }, [charger]);

  // Current real-time charger status
  const currentLiveStatus = liveStatusData?.liveStatus || charger?.liveStatus || 'AVAILABLE';
  const isAvailableNow = liveStatusData ? liveStatusData.availableNow : currentLiveStatus === 'AVAILABLE';

  // Handle Instant "Book Now" or Emergency booking
  const handleInitiateBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.role === 'ADMIN') {
      setErrorState({
        title: 'Admin Restriction',
        message: 'Admin accounts cannot perform rider bookings. Use a dedicated rider account to book charging bays.',
        code: 'ADMIN_CANNOT_BOOK',
      });
      return;
    }

    setErrorState(null);
    setIsHolding(true);

    try {
      const isEmergency = bookingMode === 'EMERGENCY';
      const slotStartTime =
        bookingMode === 'RESERVE' && selectedSlot
          ? selectedSlot.slotStart
          : new Date().toISOString();

      const selectedVehicleObj = vehicles.find((v) => v._id === selectedVehicle);

      const bookingPayload = {
        chargerId: id,
        vehicleId: selectedVehicle || undefined,
        slotStart: slotStartTime,
        durationMinutes: Number(durationMinutes),
        bookingType: isEmergency ? 'EMERGENCY' : bookingMode === 'RESERVE' ? 'RESERVATION' : 'INSTANT',
        isEmergency,
        emergencyDetails: isEmergency
          ? {
              batteryPercent: Number(batteryPercent),
              vehicleModel: selectedVehicleObj ? `${selectedVehicleObj.make} ${selectedVehicleObj.model}` : 'EV Scooter',
              connectorType: selectedVehicleObj?.connectorType || charger.connectorType || '3-pin',
              emergencyNote: emergencyNote || 'Emergency low-battery charge requested',
              userLocation: {
                coordinates: charger.location?.coordinates || [77.5946, 12.9716],
                address: 'Near charging bay',
              },
            }
          : undefined,
      };

      const res = await bookingAPI.createHold(bookingPayload);
      setHeldBooking(res.data.booking);
      setHoldRemainingSeconds(600);

      // Trigger payment checkout
      handlePaymentCheckout(res.data.booking, res.data.payment);
    } catch (err) {
      const parsed = getErrorMessage(err);
      setErrorState(parsed);
      if (parsed.code === 'SLOT_TAKEN' && bookingMode === 'RESERVE') {
        chargerAPI.getAvailability(id, selectedDate).then((r) => setAvailableSlots(r.data.slots || []));
      }
      chargerAPI.getLiveStatus(id).then((r) => setLiveStatusData(r.data));
    } finally {
      setIsHolding(false);
    }
  };

  // Payment Checkout (Razorpay Test Mode with Mock Simulator Fallback)
  const handlePaymentCheckout = (booking, orderData) => {
    if (window.Razorpay && orderData?.keyId && !orderData.isMock && orderData.keyId !== 'rzp_test_mock_chargeshot') {
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: 'INR',
        name: 'ChargeShare India',
        description: `16A Two-Wheeler Bay (${booking.bookingCode})`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const confirmRes = await bookingAPI.confirm({
              bookingId: booking._id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            onPaymentSuccess(confirmRes.data.booking);
          } catch (err) {
            setErrorState(getErrorMessage(err));
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: {
          color: '#0B3D2E',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      executeMockPayment(booking._id);
    }
  };

  // 1-Click Mock Payment Simulator
  const executeMockPayment = async (bookingId) => {
    try {
      const res = await paymentAPI.mockPay(bookingId);
      onPaymentSuccess(res.data.booking);
    } catch (err) {
      setErrorState(getErrorMessage(err));
    }
  };

  const onPaymentSuccess = (confirmedBooking) => {
    setConfirmedBookingData(confirmedBooking);
    setHeldBooking(null);
    setConfirmationModal(true);
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0B3D2E', '#0E9F6E', '#10B981'],
      });
    } catch {
      // quiet
    }
  };

  const getDirectionsUrl = () => {
    if (charger?.location?.coordinates) {
      const [lng, lat] = charger.location.coordinates;
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${charger?.address || ''}, Bengaluru`)}`;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: charger.title,
          text: `Book verified 16A two-wheeler charging at ${charger.title} on ChargeShare India`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4 animate-pulse text-brand">
          <Zap className="w-7 h-7 animate-pulse text-brand" />
        </div>
        <p className="text-text-secondary text-sm font-medium">Connecting to station telemetry...</p>
      </div>
    );
  }

  if (fetchError || !charger) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Couldn't load bay details"
            onRetry={fetchDetails}
          />
        ) : (
          <div className="p-8 rounded-3xl bg-surface border border-border shadow-luxury-sm max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4 text-rose-500">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="font-editorial text-2xl font-bold text-text-primary mb-2">Charger listing not found</h2>
            <p className="text-sm text-text-secondary mb-6">This bay may be undergoing grid maintenance or was removed.</p>
            <Link to="/explore">
              <Button variant="primary">Return to Bengaluru Map</Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  const hostPhone = charger.contactPhone || charger.hostId?.phone || '+918025550199';

  return (
    <div className="min-h-[100dvh] pb-24 bg-bg text-text-primary">
      <SEO
        title={`${charger.title} — 16A Two-Wheeler Charging Bay | ChargeShare Bengaluru`}
        description={charger.description || `Verified 16A electric two-wheeler charging bay in ${charger.address}, Bengaluru.`}
      />

      {/* Top Breadcrumb & Actions Bar */}
      <div className="border-b border-border bg-bg-raised/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-brand" />
            <span>Bengaluru Bays</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-text-secondary hover:text-rose-500 bg-surface border border-border transition-colors shadow-luxury-sm"
              title="Report issue"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-text-secondary bg-surface border border-border transition-colors shadow-luxury-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copied Link!' : 'Share'}</span>
            </button>
            <a
              href={getDirectionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-brand hover:brightness-110 transition-all shadow-luxury-sm"
            >
              <Navigation className="w-3.5 h-3.5 text-white" />
              <span>Get Directions</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Grid: Gallery & Specs (Left) + Sticky Booking Widget (Right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photos, Details, Safety, Reviews */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Bay Hero Image (Single 16:9, no carousel, no thumbnails) */}
          <div className="rounded-3xl overflow-hidden bg-surface-elevated border border-border shadow-luxury-md relative aspect-[16/9]">
            <BayImage
              src={bayPhoto}
              bayTitle={charger.title}
              priority={true}
              aspectRatio="aspect-[16/9]"
              className="w-full h-full"
            />
            {/* Live Status Badge overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-luxury ${
                  isAvailableNow
                    ? 'bg-brand text-white'
                    : 'bg-surface-elevated text-text-secondary border border-border'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isAvailableNow ? 'bg-white led-pulse-ring' : 'bg-text-muted'}`} />
                <span>{isAvailableNow ? 'Available for Plug-In' : currentLiveStatus}</span>
              </span>
            </div>
          </div>

          {/* Station Title & Location */}
          <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-luxury-sm space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-brand/10 text-brand font-bold text-xs border border-brand/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                <span>100% Earthing Verified</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-bg-raised text-text-secondary border border-border font-semibold text-xs">
                Bengaluru Geofenced
              </span>
            </div>

            <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              {charger.title}
            </h1>

            <p className="text-sm text-text-secondary flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand shrink-0" />
              <span>{charger.address}, Bengaluru, Karnataka</span>
            </p>

            <p className="text-sm text-text-secondary leading-relaxed pt-2 border-t border-border">
              {charger.description || 'Verified residential 16A smart socket equipped with dedicated grounding and dual-pole miniature circuit breaker protection. Ideal for all Indian electric two-wheelers.'}
            </p>

            {/* Key Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border text-xs">
              <div className="p-3 rounded-2xl bg-bg border border-border">
                <span className="text-text-muted font-medium block">Connector</span>
                <span className="font-bold text-text-primary text-sm">16A 3-Pin</span>
              </div>
              <div className="p-3 rounded-2xl bg-bg border border-border">
                <span className="text-text-muted font-medium block">Power</span>
                <span className="font-bold text-brand text-sm">{charger.powerKW || 3.3} kW</span>
              </div>
              <div className="p-3 rounded-2xl bg-bg border border-border">
                <span className="text-text-muted font-medium block">Earth Test</span>
                <span className="font-bold text-text-primary text-sm">&lt;5V Potential</span>
              </div>
              <div className="p-3 rounded-2xl bg-bg border border-border">
                <span className="text-text-muted font-medium block">Pricing</span>
                <span className="font-bold text-text-primary text-sm">₹{charger.price}/{charger.pricingType === 'PER_HOUR' ? 'hr' : 'kWh'}</span>
              </div>
            </div>
          </div>

          {/* Two-Wheeler Compatibility Card */}
          <div className="bg-surface p-6 rounded-3xl border border-border shadow-luxury-sm space-y-3">
            <h3 className="font-editorial text-lg font-bold text-text-primary flex items-center gap-2">
              <Bike className="w-4 h-4 text-brand" />
              <span>Supported Two-Wheelers</span>
            </h3>
            <p className="text-xs text-text-secondary">
              Compatible with standard portable chargers included with your electric scooter:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Ather 450X & 450S', 'Ola S1 Pro & Air', 'TVS iQube', 'Bajaj Chetak', 'Hero Vida V1', 'Simple One', 'River Indie'].map((v) => (
                <span key={v} className="px-3 py-1 rounded-xl bg-bg-raised border border-border text-text-primary text-xs font-semibold">
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Safety & Access Instructions */}
          <div className="bg-surface p-6 rounded-3xl border border-border shadow-luxury-sm space-y-3">
            <h3 className="font-editorial text-lg font-bold text-text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand" />
              <span>Bay Access & Safety Guidelines</span>
            </h3>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                <span>Show your digital booking QR code pass to security at the gate or building entrance.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                <span>Plug your scooter’s portable charging brick into the labeled 16A socket.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                <span>Ensure parking kickstand is safely positioned within the marked two-wheeler bay.</span>
              </li>
            </ul>

            {charger.accessInstructions && (
              <div className="p-3 rounded-2xl bg-brand/10 text-text-primary text-xs font-medium border border-brand/20 mt-2">
                <strong>Host Instructions:</strong> {charger.accessInstructions}
              </div>
            )}
          </div>

          {/* Host Contact Profile */}
          <div className="bg-surface p-6 rounded-3xl border border-border shadow-luxury-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand text-white font-bold flex items-center justify-center font-editorial text-lg">
                {charger.hostId?.name?.charAt(0) || 'H'}
              </div>
              <div>
                <h4 className="font-editorial text-base font-bold text-text-primary">
                  Hosted by {charger.hostId?.name || 'Verified Bengaluru Host'}
                </h4>
                <p className="text-xs text-text-secondary">Member since 2024 • BESCOM Utility Verified</p>
              </div>
            </div>

            <a
              href={`tel:${hostPhone}`}
              className="p-3 rounded-2xl bg-bg-raised hover:bg-surface border border-border text-text-primary transition-colors"
              title="Call Host"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>

          {/* Customer Reviews Section */}
          <div className="bg-surface p-6 sm:p-8 rounded-3xl border border-border shadow-luxury-sm space-y-4">
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              Rider Experiences ({reviews.length})
            </h3>
            {reviews.length === 0 ? (
              <p className="text-xs text-text-secondary py-3">No reviews yet for this socket. Be the first to plug in!</p>
            ) : (
              <div className="divide-y divide-border">
                {reviews.map((rev) => (
                  <div key={rev._id} className="py-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-text-primary">{rev.userId?.name || 'EV Rider'}</span>
                      <div className="flex items-center text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span className="ml-1 font-bold text-xs">{rev.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Booking Widget (Desktop) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-24 space-y-4">
          <div className="bg-surface p-6 sm:p-8 rounded-4xl border border-border shadow-luxury-lg space-y-6">
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-bg border border-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBookingMode('INSTANT')}
                className={`py-2.5 min-h-[44px] rounded-xl transition-all touch-target-min flex items-center justify-center ${
                  bookingMode === 'INSTANT' ? 'bg-brand text-white shadow-luxury-sm font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Instant
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('EMERGENCY')}
                className={`py-2.5 min-h-[44px] rounded-xl transition-all flex items-center justify-center gap-1 touch-target-min ${
                  bookingMode === 'EMERGENCY' ? 'bg-rose-600 text-white shadow-luxury-sm font-bold' : 'text-rose-500 hover:text-rose-600'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>SOS</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('RESERVE')}
                className={`py-2.5 min-h-[44px] rounded-xl transition-all touch-target-min flex items-center justify-center ${
                  bookingMode === 'RESERVE' ? 'bg-brand text-white shadow-luxury-sm font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Reserve
              </button>
            </div>

            {/* Emergency SOS Mode Notice */}
            {bookingMode === 'EMERGENCY' && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-text-primary space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-rose-500">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Emergency Two-Wheeler Dispatch</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-normal">
                  Bypasses waitlists and notifies the host immediately with your critical battery level.
                </p>
                <div>
                  <label htmlFor="battRange" className="text-[11px] font-bold block mb-1 text-text-primary">
                    Current Battery: {batteryPercent}%
                  </label>
                  <input
                    id="battRange"
                    type="range"
                    min="1"
                    max="30"
                    value={batteryPercent}
                    onChange={(e) => setBatteryPercent(Number(e.target.value))}
                    className="w-full accent-rose-600"
                  />
                </div>
              </div>
            )}

            {/* Advance Slot Booking Selector (Only in RESERVE mode) */}
            {bookingMode === 'RESERVE' && (
              <div className="space-y-3">
                <label htmlFor="resDate" className="text-xs font-bold text-text-primary block">
                  Select Date:
                </label>
                <input
                  id="resDate"
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs text-text-primary font-semibold bg-surface"
                />

                {slotsLoading ? (
                  <p className="text-xs text-text-muted text-center py-4">Checking slot availability...</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">No reserved slots available on this date.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((slot, idx) => {
                      const isSel = selectedSlot?.slotStart === slot.slotStart;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all border flex items-center justify-center touch-target-min ${
                            isSel
                              ? 'bg-brand text-white border-brand'
                              : slot.available
                              ? 'bg-surface border-border text-text-primary hover:bg-bg-raised'
                              : 'bg-bg text-text-muted border-transparent cursor-not-allowed'
                          }`}
                        >
                          {new Date(slot.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Flexible Charging Duration (Minutes) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-text-primary block">
                Charging Duration:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all border flex items-center justify-center touch-target-min ${
                      durationMinutes === mins
                        ? 'bg-brand text-white border-brand shadow-luxury-sm'
                        : 'bg-surface text-text-primary border-border hover:bg-bg-raised'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Selection */}
            {vehicles.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="vehicleSelect" className="text-xs font-bold text-text-primary block">
                  Select Vehicle from Garage:
                </label>
                <select
                  id="vehicleSelect"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border text-xs text-text-primary font-semibold bg-surface"
                >
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.make} {v.model} ({v.plateNumber || 'EV'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="p-4 rounded-2xl bg-bg border border-border space-y-2 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>16A Socket Usage ({durationMinutes} mins)</span>
                <span className="font-bold text-text-primary">₹{baseAmount}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Platform Security & Earthing Guarantee (5%)</span>
                <span className="font-bold text-text-primary">₹{platformFee}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-text-primary pt-2 border-t border-border">
                <span>Total Amount</span>
                <span className="text-base text-brand font-bold">₹{totalAmount}</span>
              </div>
            </div>

            {errorState && (
              <ErrorAlert
                error={errorState}
                onDismiss={() => setErrorState(null)}
                className="mb-4"
              />
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={isHolding || (bookingMode === 'RESERVE' && !selectedSlot)}
              onClick={handleInitiateBooking}
              className={`w-full py-4 min-h-[48px] rounded-2xl font-bold text-sm text-white transition-all shadow-luxury flex items-center justify-center gap-2 touch-target-min ${
                bookingMode === 'EMERGENCY'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-brand hover:brightness-110'
              } ${isHolding ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isHolding ? (
                <span>Securing 10-Minute Lock...</span>
              ) : bookingMode === 'EMERGENCY' ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Send SOS Booking Request (₹{totalAmount})</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-white fill-white" />
                  <span>Reserve Bay Now (₹{totalAmount})</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-text-muted text-center">
              <Lock className="w-3.5 h-3.5 text-brand" />
              <span>10-minute hold guarantees zero double bookings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Booking CTA Bar (< lg) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-surface/95 backdrop-blur-2xl -webkit-backdrop-blur-2xl border-t border-border px-4 py-3 shadow-luxury-xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
              {isAvailableNow ? 'Available for Plug-In' : currentLiveStatus}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-editorial text-xl font-bold text-text-primary">
                ₹{charger.price}
              </span>
              <span className="text-xs text-text-secondary">/{charger.pricingType === 'PER_HOUR' ? 'hr' : 'kWh'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileBookingSheetOpen(true)}
            className="px-6 py-3 min-h-[44px] rounded-2xl bg-brand text-white font-bold text-xs shadow-luxury-sm hover:brightness-110 flex items-center gap-2 touch-target-min"
          >
            <Zap className="w-4 h-4 text-white fill-white" />
            <span>Book Bay Now</span>
          </button>
        </div>
      </div>

      {/* Mobile Booking Sheet Modal */}
      <Modal
        isOpen={mobileBookingSheetOpen}
        onClose={() => setMobileBookingSheetOpen(false)}
        title="Book 16A Charging Bay"
      >
        <div className="space-y-6 pt-2">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-bg border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBookingMode('INSTANT')}
              className={`py-2.5 min-h-[44px] rounded-xl transition-all touch-target-min flex items-center justify-center ${
                bookingMode === 'INSTANT' ? 'bg-brand text-white shadow-luxury-sm font-bold' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Instant
            </button>
            <button
              type="button"
              onClick={() => setBookingMode('EMERGENCY')}
              className={`py-2.5 min-h-[44px] rounded-xl transition-all flex items-center justify-center gap-1 touch-target-min ${
                bookingMode === 'EMERGENCY' ? 'bg-rose-600 text-white shadow-luxury-sm font-bold' : 'text-rose-500 hover:text-rose-600'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>SOS</span>
            </button>
            <button
              type="button"
              onClick={() => setBookingMode('RESERVE')}
              className={`py-2.5 min-h-[44px] rounded-xl transition-all touch-target-min flex items-center justify-center ${
                bookingMode === 'RESERVE' ? 'bg-brand text-white shadow-luxury-sm font-bold' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Reserve
            </button>
          </div>

          {/* Emergency SOS Mode Notice */}
          {bookingMode === 'EMERGENCY' && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-text-primary space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-rose-500">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Emergency Two-Wheeler Dispatch</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-normal">
                Bypasses waitlists and notifies the host immediately with your critical battery level.
              </p>
              <div>
                <label htmlFor="battRangeMobile" className="text-[11px] font-bold block mb-1 text-text-primary">
                  Current Battery: {batteryPercent}%
                </label>
                <input
                  id="battRangeMobile"
                  type="range"
                  min="1"
                  max="30"
                  value={batteryPercent}
                  onChange={(e) => setBatteryPercent(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>
            </div>
          )}

          {/* Advance Slot Booking Selector */}
          {bookingMode === 'RESERVE' && (
            <div className="space-y-3">
              <label htmlFor="resDateMobile" className="text-xs font-bold text-text-primary block">
                Select Date:
              </label>
              <input
                id="resDateMobile"
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border text-xs text-text-primary font-semibold bg-surface"
              />

              {slotsLoading ? (
                <p className="text-xs text-text-muted text-center py-4">Checking slot availability...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">No reserved slots available on this date.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map((slot, idx) => {
                    const isSel = selectedSlot?.slotStart === slot.slotStart;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all border flex items-center justify-center touch-target-min ${
                          isSel
                            ? 'bg-brand text-white border-brand'
                            : slot.available
                            ? 'bg-surface border-border text-text-primary hover:bg-bg-raised'
                            : 'bg-bg text-text-muted border-transparent cursor-not-allowed'
                        }`}
                      >
                        {new Date(slot.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Flexible Charging Duration */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-text-primary block">
              Charging Duration:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all border flex items-center justify-center touch-target-min ${
                    durationMinutes === mins
                      ? 'bg-brand text-white border-brand shadow-luxury-sm'
                      : 'bg-surface text-text-primary border-border hover:bg-bg-raised'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Selection */}
          {vehicles.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="vehicleSelectMobile" className="text-xs font-bold text-text-primary block">
                Select Vehicle:
              </label>
              <select
                id="vehicleSelectMobile"
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border text-xs text-text-primary font-semibold bg-surface"
              >
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.make} {v.model} ({v.plateNumber || 'EV'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="p-4 rounded-2xl bg-bg border border-border space-y-2 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>16A Socket Usage ({durationMinutes} mins)</span>
              <span className="font-bold text-text-primary">₹{baseAmount}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Platform Security & Earthing Guarantee (5%)</span>
              <span className="font-bold text-text-primary">₹{platformFee}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-text-primary pt-2 border-t border-border">
              <span>Total Amount</span>
              <span className="text-base text-brand font-bold">₹{totalAmount}</span>
            </div>
          </div>

          {errorState && (
            <ErrorAlert
              error={errorState}
              onDismiss={() => setErrorState(null)}
              className="mb-4"
            />
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={isHolding || (bookingMode === 'RESERVE' && !selectedSlot)}
            onClick={handleInitiateBooking}
            className={`w-full py-4 min-h-[48px] rounded-2xl font-bold text-sm text-white transition-all shadow-luxury flex items-center justify-center gap-2 touch-target-min ${
              bookingMode === 'EMERGENCY'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-brand hover:brightness-110'
            } ${isHolding ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isHolding ? (
              <span>Securing 10-Minute Lock...</span>
            ) : bookingMode === 'EMERGENCY' ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Send SOS Booking Request (₹{totalAmount})</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-white fill-white" />
                <span>Reserve Bay Now (₹{totalAmount})</span>
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* Confirmation Modal (Boarding Pass / QR Code) */}
      {confirmationModal && confirmedBookingData && (
        <Modal isOpen={confirmationModal} onClose={() => setConfirmationModal(false)} title="Booking Confirmed!">
          <div className="space-y-6 text-center py-2">
            <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto shadow-luxury">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold text-brand uppercase tracking-wider block">
                Your 16A Digital Pass
              </span>
              <h3 className="font-editorial text-2xl font-bold text-text-primary mt-1">
                {charger.title}
              </h3>
              <p className="text-xs text-text-secondary">{charger.address}</p>
            </div>

            {/* QR Code Container - Fluid between 200px and 280px */}
            <div className="p-4 bg-white rounded-3xl border border-border inline-block shadow-luxury-md max-w-[280px] w-full mx-auto">
              <div className="w-full aspect-square flex items-center justify-center">
                <QRCodeSVG
                  value={JSON.stringify({
                    bookingId: confirmedBookingData._id,
                    bookingCode: confirmedBookingData.bookingCode,
                    chargerId: charger._id,
                  })}
                  size={220}
                  className="w-full h-full max-w-[240px] max-h-[240px]"
                />
              </div>
              <span className="text-xs font-extrabold text-neutral-900 block mt-2 font-mono">
                Pass Code: {confirmedBookingData.bookingCode}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <a
                href={getDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl bg-brand text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-luxury-sm hover:brightness-110 touch-target-min"
              >
                <Navigation className="w-4 h-4 text-white" />
                <span>Start Navigation</span>
              </a>
              <Link
                to="/my-bookings"
                className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl bg-surface text-text-primary border border-border font-bold text-xs shadow-luxury-sm hover:bg-bg-raised flex items-center justify-center touch-target-min"
              >
                View in My Passes
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {/* Report Bay Safety Modal */}
      {showReportModal && (
        <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Report Station Issue">
          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div>
              <label htmlFor="repReason" className="text-xs font-bold text-text-primary block mb-1">
                Reason for Report:
              </label>
              <select
                id="repReason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border text-xs text-text-primary bg-surface"
              >
                <option value="BROKEN_HARDWARE">Hardware Defect / Broken 16A Socket</option>
                <option value="EARTHING_FAULT">Poor Earthing / Sparking</option>
                <option value="INCORRECT_LOCATION">Inaccurate GPS / Access Denied</option>
                <option value="BLOCKED_BAY">Bay Blocked by Other Vehicles (ICEing)</option>
                <option value="OVERCHARGING">Price Discrepancy</option>
              </select>
            </div>

            <div>
              <label htmlFor="repDesc" className="text-xs font-bold text-text-primary block mb-1">
                Details (Minimum 10 characters):
              </label>
              <textarea
                id="repDesc"
                rows="4"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe the issue encountered at this charging bay..."
                className="w-full p-3 rounded-xl border border-border text-xs text-text-primary bg-surface"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold text-text-secondary bg-surface hover:bg-bg-raised border border-border touch-target-min"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReport}
                className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 touch-target-min"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
