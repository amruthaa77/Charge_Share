import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chargerAPI, verificationAPI, uploadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { LocationPickerMap } from '../components/map/LocationPickerMap';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { getErrorMessage } from '../utils/errorMapper';
import {
  Zap,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Bike,
  Sparkles,
} from 'lucide-react';

export const HostOnboardPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);

  // Step 1: Charger Details (Default to 16A Two-Wheeler Socket)
  const [title, setTitle] = useState('Indiranagar Residential 16A Bay');
  const [description, setDescription] = useState('Verified 16A heavy-duty outdoor socket with copper earthing bus and dedicated MCB breaker. Perfect for Ather, Ola, and TVS scooters.');
  const [connectorType, setConnectorType] = useState('3-pin');
  const [powerKW, setPowerKW] = useState(3.3);
  const [pricingType, setPricingType] = useState('PER_HOUR');
  const [price, setPrice] = useState(14);
  const [instantBooking, setInstantBooking] = useState(true);

  // Step 2: Location
  const [address, setAddress] = useState('100ft Road, Indiranagar');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('560038');
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);

  // Step 3: Schedule
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('22:00');

  // Step 4: Verification & Safety Checklist
  const [idProofType, setIdProofType] = useState('AADHAAR');
  const [idProofUrl, setIdProofUrl] = useState(
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600'
  );
  const [propertyProofType, setPropertyProofType] = useState('ELECTRICITY_BILL');
  const [propertyProofUrl, setPropertyProofUrl] = useState(
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600'
  );
  const [nocDocumentUrl, setNocDocumentUrl] = useState('');
  const [safetyChecklist, setSafetyChecklist] = useState({
    earthingVerified: true,
    mcbRccbInstalled: true,
    weatherproofProtection: true,
    cctvSurveillance: true,
    fireExtinguisherNearby: false,
  });
  const [propertyConsentDeclared, setPropertyConsentDeclared] = useState(false);
  const [termsConsentDeclared, setTermsConsentDeclared] = useState(false);

  // Upload handler
  const handleFileUpload = async (e, setUrl) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrorState(null);
    try {
      const res = await uploadAPI.uploadFile(file);
      setUrl(res.data.fileUrl);
    } catch (err) {
      setErrorState(getErrorMessage(err));
    }
  };

  const handleNextStep = () => {
    setErrorState(null);
    if (step === 1) {
      if (!title || !description || !price) {
        setErrorState({
          title: 'Incomplete Details',
          message: 'Please fill in all socket details before proceeding.',
        });
        return;
      }
    }
    if (step === 2) {
      if (!address || !city || !postalCode) {
        setErrorState({
          title: 'Incomplete Address',
          message: 'Please fill in complete address and PIN code.',
        });
        return;
      }
      if (latitude < 12.80 || latitude > 13.15 || longitude < 77.45 || longitude > 77.75) {
        setErrorState({
          title: 'Outside Operating Area',
          message: 'Location coordinates must be strictly within Bengaluru bounds (Lat 12.80 - 13.15, Lng 77.45 - 77.75).',
        });
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!propertyConsentDeclared) {
      setErrorState({
        title: 'Consent Required',
        message: 'You must formally declare property consent or society NOC to continue.',
      });
      return;
    }

    if (!termsConsentDeclared) {
      setErrorState({
        title: 'Agreement Required',
        message: 'You must review and agree to the Terms of Service and Privacy Policy to proceed.',
      });
      return;
    }

    if (latitude < 12.80 || latitude > 13.15 || longitude < 77.45 || longitude > 77.75) {
      setErrorState({
        title: 'Outside Operating Area',
        message: 'Location coordinates must fall strictly within the Bengaluru geofence (Lat 12.80 - 13.15, Lng 77.45 - 77.75).',
      });
      setStep(2);
      return;
    }

    setLoading(true);
    setErrorState(null);

    try {
      const weeklySchedule = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        day,
        open: openTime,
        close: closeTime,
        isActive: true,
      }));

      const chargerRes = await chargerAPI.create({
        title,
        description,
        address,
        city,
        state,
        postalCode,
        latitude,
        longitude,
        connectorType,
        powerKW: Number(powerKW),
        pricingType,
        price: Number(price),
        instantBooking,
        weeklySchedule,
        photos: ['/images/bays/bay-1.webp'],
      });

      const chargerId = chargerRes.data.charger._id;

      await verificationAPI.submit({
        chargerId,
        idProofType,
        idProofUrl,
        propertyProofType,
        propertyProofUrl,
        nocDocumentUrl,
        safetyChecklist,
        propertyConsentDeclared,
      });

      navigate('/host/dashboard');
    } catch (err) {
      const parsed = getErrorMessage(err);
      setErrorState(parsed);
      if (parsed.code === 'OUTSIDE_GEOFENCE') {
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: '16A Socket Specs', icon: Zap },
    { num: 2, label: 'Bengaluru Pin', icon: MapPin },
    { num: 3, label: 'Schedule', icon: Clock },
    { num: 4, label: 'Safety & KYC', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-[100dvh] pb-24 bg-bg text-text-primary transition-colors">
      {/* Header Banner */}
      <div className="border-b border-border bg-surface-translucent backdrop-blur-xl -webkit-backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-brand uppercase tracking-widest bg-brand/10 px-2.5 py-1 rounded-full">
              Host Onboarding Wizard
            </span>
            <span className="text-xs text-text-secondary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand led-pulse-ring" />
              <span>Bengaluru 16A Network</span>
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            Monetize Your Outdoor Socket
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            List your 16A 3-pin outlet or private parking bay for electric scooters across Bengaluru.
          </p>

          {/* Stepper Progress Indicator: Compact on mobile, 4-step on sm+ */}
          <div className="pt-6">
            {/* Mobile Compact Stepper (< sm) */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="font-bold text-text-primary">
                  Step {step} of {steps.length}: <span className="text-brand">{steps[step - 1].label}</span>
                </span>
                <span className="text-text-muted">{Math.round((step / steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand h-full rounded-full transition-all duration-300"
                  style={{ width: `${(step / steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Tablet/Desktop Stepper (sm+) */}
            <div className="hidden sm:grid grid-cols-4 gap-2">
              {steps.map((s) => {
                const isPast = step > s.num;
                const isCurrent = step === s.num;
                const Icon = s.icon;
                return (
                  <div key={s.num} className="flex flex-col items-center text-center space-y-1.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs transition-all ${
                        isPast
                          ? 'bg-brand text-brand-contrast shadow-luxury-sm'
                          : isCurrent
                          ? 'bg-text-primary text-bg shadow-luxury'
                          : 'bg-surface text-text-muted border border-border'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span
                      className={`text-xs font-semibold truncate max-w-full ${
                        isCurrent ? 'text-text-primary font-bold' : 'text-text-secondary'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-surface p-6 sm:p-10 rounded-4xl border border-border shadow-luxury-sm space-y-6">
          {errorState && (
            <ErrorAlert
              error={errorState}
              onDismiss={() => setErrorState(null)}
            />
          )}

          {/* STEP 1: CHARGER SPECIFICATIONS */}
          {step === 1 && (
            <div className="space-y-5 text-xs">
              <div>
                <label htmlFor="bayTitle" className="text-xs font-bold text-text-primary block mb-1">
                  Bay Title:
                </label>
                <input
                  id="bayTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Indiranagar 100ft Residential Bay"
                  className="cs-input"
                />
              </div>

              <div>
                <label htmlFor="bayDesc" className="text-xs font-bold text-text-primary block mb-1">
                  Description & Access Details:
                </label>
                <textarea
                  id="bayDesc"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your 16A socket, parking spot access, gate security guidelines..."
                  className="cs-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="connTypeSelect" className="text-xs font-bold text-text-primary block mb-1">
                    Connector Type:
                  </label>
                  <select
                    id="connTypeSelect"
                    value={connectorType}
                    onChange={(e) => setConnectorType(e.target.value)}
                    className="cs-input cursor-pointer"
                  >
                    <option value="3-pin">16A 3-Pin Heavy Duty (EV Bikes / Scooters)</option>
                    <option value="Bharat AC-001">Bharat AC-001 (3.3 kW)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="powerKWInput" className="text-xs font-bold text-text-primary block mb-1">
                    Power Output (kW):
                  </label>
                  <input
                    id="powerKWInput"
                    type="number"
                    step="0.1"
                    value={powerKW}
                    onChange={(e) => setPowerKW(e.target.value)}
                    className="cs-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pricingTypeSelect" className="text-xs font-bold text-text-primary block mb-1">
                    Pricing Basis:
                  </label>
                  <select
                    id="pricingTypeSelect"
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value)}
                    className="cs-input cursor-pointer"
                  >
                    <option value="PER_HOUR">Per Hour (₹/hr)</option>
                    <option value="PER_KWH">Per kWh (₹/kWh)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="priceInput" className="text-xs font-bold text-text-primary block mb-1">
                    Rate (₹):
                  </label>
                  <input
                    id="priceInput"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="14"
                    className="cs-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              <div>
                <label htmlFor="addrInput" className="text-xs font-bold text-text-primary block mb-1">
                  Street Address:
                </label>
                <input
                  id="addrInput"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 100ft Road, Indiranagar"
                  className="cs-input"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="cityInput" className="text-xs font-bold text-text-primary block mb-1">City:</label>
                  <input
                    id="cityInput"
                    type="text"
                    value="Bengaluru"
                    disabled
                    className="cs-input opacity-70 cursor-not-allowed bg-bg-soft"
                  />
                </div>
                <div>
                  <label htmlFor="stateInput" className="text-xs font-bold text-text-primary block mb-1">State:</label>
                  <input
                    id="stateInput"
                    type="text"
                    value="Karnataka"
                    disabled
                    className="cs-input opacity-70 cursor-not-allowed bg-bg-soft"
                  />
                </div>
                <div>
                  <label htmlFor="pinInput" className="text-xs font-bold text-text-primary block mb-1">PIN Code:</label>
                  <input
                    id="pinInput"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="560038"
                    className="cs-input"
                  />
                </div>
              </div>

              <div className="h-64 rounded-3xl overflow-hidden border border-border shadow-luxury-sm">
                <LocationPickerMap
                  lat={latitude}
                  lng={longitude}
                  onChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: SCHEDULE */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <p className="text-text-secondary">
                Specify regular hours during which electric scooter riders may book and plug into your 16A socket.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="openTimeInput" className="text-xs font-bold text-text-primary block mb-1">
                    Opens At:
                  </label>
                  <input
                    id="openTimeInput"
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="cs-input"
                  />
                </div>
                <div>
                  <label htmlFor="closeTimeInput" className="text-xs font-bold text-text-primary block mb-1">
                    Closes At:
                  </label>
                  <input
                    id="closeTimeInput"
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="cs-input"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-bg-soft border border-border space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-text-primary text-xs">
                  <input
                    type="checkbox"
                    checked={instantBooking}
                    onChange={(e) => setInstantBooking(e.target.checked)}
                    className="rounded accent-emerald-600 w-4 h-4"
                  />
                  <span>Enable Instant Plug-In (Recommended)</span>
                </label>
                <p className="text-text-secondary text-xs leading-relaxed">
                  Riders can lock the slot directly without manual host SMS confirmations.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: SAFETY & KYC */}
          {step === 4 && (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-2xl bg-brand/10 border border-brand/20 text-text-primary space-y-1">
                <span className="font-bold block text-xs">16A Earthing & Safety Compliance</span>
                <p className="text-xs text-text-secondary">
                  To protect EV two-wheeler batteries, all ChargeShare listings must confirm dedicated physical grounding.
                </p>
              </div>

              {/* Safety Checkbox Group */}
              <div className="space-y-2.5">
                {[
                  { key: 'earthingVerified', label: 'Earthing tested (neutral-to-earth potential < 5V)' },
                  { key: 'mcbRccbInstalled', label: '16A dedicated MCB breaker installed' },
                  { key: 'weatherproofProtection', label: 'Outdoor socket is IP55/IP66 weatherproof' },
                  { key: 'cctvSurveillance', label: 'Parking bay is monitored by security or CCTV' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2.5 cursor-pointer text-text-primary font-medium text-xs">
                    <input
                      type="checkbox"
                      checked={safetyChecklist[item.key]}
                      onChange={(e) =>
                        setSafetyChecklist({ ...safetyChecklist, [item.key]: e.target.checked })
                      }
                      className="rounded accent-emerald-600 w-4 h-4"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              {/* Legal Declarations */}
              <div className="space-y-3 pt-3 border-t border-border">
                <label className="flex items-start gap-2.5 cursor-pointer text-text-primary font-medium text-xs">
                  <input
                    type="checkbox"
                    checked={propertyConsentDeclared}
                    onChange={(e) => setPropertyConsentDeclared(e.target.checked)}
                    className="rounded accent-emerald-600 w-4 h-4 mt-0.5"
                  />
                  <span className="leading-relaxed">
                    I certify that I am the property owner (or hold an approved RWA / Society No-Objection Certificate) to monetize this electrical socket.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-text-primary font-medium text-xs">
                  <input
                    type="checkbox"
                    checked={termsConsentDeclared}
                    onChange={(e) => setTermsConsentDeclared(e.target.checked)}
                    className="rounded accent-emerald-600 w-4 h-4 mt-0.5"
                  />
                  <span className="leading-relaxed">
                    I accept the ChargeShare India Terms of Service, Hosting Guidelines, and Payout Terms.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons with safe-area padding and 44px touch targets */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-border">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-text-secondary bg-surface hover:bg-bg-soft border border-border touch-target-min flex items-center justify-center"
              >
                Previous Step
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-brand-contrast bg-brand hover:opacity-90 shadow-luxury-sm touch-target-min flex items-center justify-center ml-auto"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-brand-contrast bg-brand hover:brightness-110 shadow-luxury-sm disabled:opacity-50 touch-target-min flex items-center justify-center ml-auto"
              >
                {loading ? 'Submitting Application...' : 'Publish 16A Socket'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
