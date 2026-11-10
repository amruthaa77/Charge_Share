import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { chargerAPI } from '../services/api';
import { ChargerMap, isWithinBengaluru } from '../components/map/ChargerMap';
import { normalizeChargerList } from '../utils/normalizeCharger';
import { ScopedErrorBoundary } from '../components/common/ScopedErrorBoundary';
import { CardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { DataErrorState } from '../components/common/DataErrorState';
import { BayImage } from '../components/common/BayImage';
import {
  Zap,
  Star,
  RefreshCw,
  ChevronRight,
  Map as MapIcon,
  List as ListIcon,
  RotateCcw,
  Bike,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
} from 'lucide-react';

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
};

export const ExplorePage = () => {
  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [selectedCharger, setSelectedCharger] = useState(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  // Mobile View Toggle: 'list' or 'map'
  const [mobileTab, setMobileTab] = useState('list');
  // Mobile Bottom Sheet state: 'peek' | 'half' | 'full'
  const [sheetState, setSheetState] = useState('half');

  // Emergency Mode state
  const isEmergencyMode = searchParams.get('mode') === 'emergency';

  // Real-time quick filters
  const [availableNowOnly, setAvailableNowOnly] = useState(isEmergencyMode);
  const [emergencyReadyOnly, setEmergencyReadyOnly] = useState(isEmergencyMode);

  // Bengaluru tech corridor / locality presets
  const bengaluruCorridors = [
    'All Bengaluru',
    'Indiranagar',
    'Koramangala',
    'HSR Layout',
    'Whitefield',
    'Bellandur / ORR',
    'Electronic City',
    'Jayanagar',
    'Malleshwaram',
  ];

  // Filters (exclusively restricted to Bengaluru)
  const [selectedCorridor, setSelectedCorridor] = useState(() => {
    const rawParam = searchParams.get('area') || searchParams.get('city') || '';
    if (rawParam && rawParam.toLowerCase() !== 'bengaluru' && rawParam.toLowerCase() !== 'all cities') {
      const match = bengaluruCorridors.find((c) => c.toLowerCase().includes(rawParam.toLowerCase()));
      return match || rawParam;
    }
    return 'All Bengaluru';
  });

  const [connectorType, setConnectorType] = useState(searchParams.get('connectorType') || '');
  const [maxPrice, setMaxPrice] = useState('');
  const [verifiedOnly] = useState(true);

  const toggleEmergencyMode = () => {
    if (isEmergencyMode) {
      searchParams.delete('mode');
      setSearchParams(searchParams);
      setAvailableNowOnly(false);
      setEmergencyReadyOnly(false);
    } else {
      searchParams.set('mode', 'emergency');
      setSearchParams(searchParams);
      setAvailableNowOnly(true);
      setEmergencyReadyOnly(true);
    }
  };

  const fetchChargers = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setApiError(null);

    try {
      const params = {
        city: 'Bengaluru',
        verifiedOnly,
      };

      if (connectorType) params.connectorType = connectorType;
      if (maxPrice) params.maxPrice = maxPrice;
      if (emergencyReadyOnly || isEmergencyMode) params.emergencyOnly = true;

      const res = await chargerAPI.search(params);
      if (!isMountedRef.current) return;

      const rawList = res?.data?.chargers || [];

      // Sanitize and strictly normalize charger objects
      let list = normalizeChargerList(rawList);

      // Filter by Bengaluru corridor/neighborhood if specified
      if (selectedCorridor && selectedCorridor !== 'All Bengaluru') {
        const terms = selectedCorridor.split('/').map((s) => s.trim().toLowerCase());
        list = list.filter((c) => {
          const text = `${c.title} ${c.address} ${c.description || ''}`.toLowerCase();
          return terms.some((t) => text.includes(t));
        });
      }

      // Filter by availableNow if toggled
      if (availableNowOnly || isEmergencyMode) {
        list = list.filter((c) => c.availableNow !== false);
      }

      if (!isMountedRef.current) return;

      setChargers(list);
      if (list.length > 0 && !selectedCharger) {
        setSelectedCharger(list[0]);
      } else if (list.length === 0) {
        setSelectedCharger(null);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }
      console.error('Failed to search chargers', err);
      if (isMountedRef.current) {
        setApiError(err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchChargers();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    selectedCorridor,
    connectorType,
    maxPrice,
    verifiedOnly,
    availableNowOnly,
    emergencyReadyOnly,
    isEmergencyMode,
  ]);

  const resetFilters = () => {
    setSelectedCorridor('All Bengaluru');
    setConnectorType('');
    setMaxPrice('');
    setAvailableNowOnly(false);
    setEmergencyReadyOnly(false);
    if (isEmergencyMode) {
      searchParams.delete('mode');
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100dvh-64px)] bg-bg text-text-primary transition-colors">
      {/* Editorial Control & Filter Header */}
      <div className="border-b border-border bg-bg-raised px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title and Active Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-editorial text-lg sm:text-xl font-bold tracking-tight text-text-primary">
                  Bengaluru Two-Wheeler Bays
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full border border-brand/20">
                  <CheckCircle2 className="w-3 h-3 text-brand" />
                  <span>16A Certified</span>
                </span>
              </div>
              <p className="text-xs text-text-secondary flex items-center gap-2">
                <span>{loading ? 'Discovering bays...' : `${chargers.length} Active Sockets`}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-brand font-medium">
                  <Navigation className="w-3 h-3" />
                  Strictly Geofenced to Bengaluru
                </span>
              </p>
            </div>
          </div>

          {/* Quick Filter Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Emergency Mode Toggle Pill */}
            <button
              type="button"
              onClick={toggleEmergencyMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer ${
                isEmergencyMode
                  ? 'bg-rose-600 text-white shadow-luxury-md'
                  : 'bg-surface hover:bg-bg-elevated text-text-primary border border-border'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isEmergencyMode ? 'fill-white text-white' : 'text-amber-500'}`} />
              <span>{isEmergencyMode ? 'Emergency Active' : 'Emergency Mode'}</span>
            </button>

            {/* Available Now Toggle Pill */}
            <button
              type="button"
              onClick={() => setAvailableNowOnly(!availableNowOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer ${
                availableNowOnly
                  ? 'bg-brand text-brand-contrast shadow-luxury-md'
                  : 'bg-surface hover:bg-bg-elevated text-text-primary border border-border'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-brand" />
              <span>Available Now</span>
            </button>

            {/* Corridor Select Dropdown */}
            <div className="relative">
              <select
                value={selectedCorridor}
                onChange={(e) => setSelectedCorridor(e.target.value)}
                aria-label="Filter by Bengaluru Corridor"
                className="appearance-none bg-surface hover:bg-bg-elevated text-text-primary border border-border rounded-xl px-3 py-1.5 pr-8 text-xs font-bold transition-all min-h-[38px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {bengaluruCorridors.map((c) => (
                  <option key={c} value={c} className="bg-surface text-text-primary">
                    {c}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-muted">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>

            {/* Reset Button */}
            {(selectedCorridor !== 'All Bengaluru' || connectorType || maxPrice || availableNowOnly || emergencyReadyOnly || isEmergencyMode) && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-colors min-h-[38px] cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile View Switcher (List vs Map) */}
        <div className="lg:hidden flex items-center justify-center gap-1 mt-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => {
              setMobileTab('list');
              setSheetState('half');
            }}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[36px] cursor-pointer ${
              sheetState === 'full' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" /> <span>List View</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileTab('map');
              setSheetState('peek');
            }}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[36px] cursor-pointer ${
              sheetState === 'peek' ? 'bg-brand text-brand-contrast shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> <span>Map View</span>
          </button>
        </div>
      </div>

      {/* Desktop Layout: Split Grid (cols-12) */}
      <div className="hidden lg:grid flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid-cols-12 gap-6 overflow-hidden">
        {/* Left Column: List of Verified Sockets */}
        <div className="col-span-5 flex flex-col h-[calc(100dvh-240px)] overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
          <ScopedErrorBoundary
            name="DesktopChargerList"
            fallbackTitle="Unable to display chargers list"
            fallbackMessage="We encountered an issue loading socket listings. Click retry to refresh."
            onRetry={fetchChargers}
          >
            {apiError ? (
              <DataErrorState
                error={apiError}
                title="Couldn't load chargers"
                onRetry={fetchChargers}
                className="my-2"
              />
            ) : loading ? (
              Array(4)
                .fill(0)
                .map((_, i) => <CardSkeleton key={i} />)
            ) : chargers.length === 0 ? (
              <EmptyState
                title="No chargers match your criteria"
                message="Try broadening your filters or resetting to 'All Bengaluru' to discover available two-wheeler sockets."
                actionLabel="Reset Filters"
                onAction={resetFilters}
              />
            ) : (
              chargers.map((charger) => {
                const isSelected = selectedCharger?._id === charger._id;
                const bayPhoto = charger.image || (charger.photos && charger.photos[0]) || '';
                return (
                  <div
                    key={charger._id}
                    onClick={() => setSelectedCharger(charger)}
                    className={`p-5 rounded-3xl bg-surface border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand shadow-luxury-md ring-2 ring-brand/20'
                        : 'border-border shadow-luxury-sm hover:border-brand/40 hover:shadow-luxury'
                    }`}
                  >
                    <div className="flex gap-3 sm:gap-4 items-start mb-2">
                      {/* Compact Bay Thumbnail (96x72 desktop / 72x54 sm) */}
                      <div className="w-[84px] h-[63px] sm:w-[96px] sm:h-[72px] rounded-2xl overflow-hidden shrink-0 border border-border shadow-sm bg-bg-soft mt-0.5">
                        <BayImage
                          src={bayPhoto}
                          bayTitle={charger.title}
                          isThumbnail={true}
                          className="w-full h-full"
                          aspectRatio="aspect-[4/3]"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                                <span>Verified 16A</span>
                              </span>
                              <span className="text-[11px] font-semibold text-text-secondary truncate">
                                {charger.powerKW || 3.3} kW Single-Phase
                              </span>
                            </div>
                            <h3 className="font-editorial text-lg font-bold text-text-primary leading-snug truncate">
                              {charger.title}
                            </h3>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-base font-extrabold text-brand">
                              ₹{charger.price}
                            </div>
                            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                              per {charger.pricingType === 'PER_HOUR' ? 'hour' : 'kWh'}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-text-secondary line-clamp-1 mb-1">
                          {charger.address}
                        </p>
                      </div>
                    </div>

                    {/* Two-Wheeler Compatibility Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-4">
                      <span className="px-2 py-0.5 rounded-lg bg-bg-elevated text-text-secondary border border-border text-[10px] font-semibold">
                        Ather 450X
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-bg-elevated text-text-secondary border border-border text-[10px] font-semibold">
                        Ola S1 Pro
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-bg-elevated text-text-secondary border border-border text-[10px] font-semibold">
                        TVS iQube
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-bg-elevated text-text-secondary border border-border text-[10px] font-semibold">
                        Bajaj Chetak
                      </span>
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                      <div className="flex items-center gap-1 text-brand font-semibold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-brand led-pulse-ring" />
                        <span>Ready to plug in</span>
                      </div>

                      <Link
                        to={`/chargers/${charger._id}`}
                        className="px-4 py-2 min-h-[44px] rounded-xl bg-brand hover:opacity-90 text-brand-contrast font-bold text-xs transition-colors flex items-center gap-1 shadow-luxury-sm cursor-pointer touch-target-min"
                      >
                        <span>Book Slot</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </ScopedErrorBoundary>
        </div>

        {/* Right Column: Live Map (Mounted only when on desktop >= 1024px) */}
        <div className="col-span-7 h-[calc(100dvh-240px)] rounded-3xl overflow-hidden shadow-luxury-md border border-border">
          <ScopedErrorBoundary
            name="DesktopChargerMap"
            fallbackTitle="Map view unavailable"
            fallbackMessage="You can still browse and book the verified charging bays in the list."
            onRetry={fetchChargers}
          >
            {isDesktop ? (
              <ChargerMap
                chargers={chargers}
                selectedCharger={selectedCharger}
                onSelectCharger={(c) => setSelectedCharger(c)}
              />
            ) : null}
          </ScopedErrorBoundary>
        </div>
      </div>

      {/* Mobile Layout: Full-Screen Map with Interactive Bottom Sheet */}
      <div className="lg:hidden relative flex-1 w-full h-[calc(100dvh-200px)] overflow-hidden">
        {/* Full-width Map Background (Mounted only when on mobile < 1024px) */}
        <div className="absolute inset-0 z-0">
          <ScopedErrorBoundary
            name="MobileChargerMap"
            fallbackTitle="Map view unavailable"
            fallbackMessage="You can still browse and book verified charging bays below."
            onRetry={fetchChargers}
          >
            {!isDesktop ? (
              <ChargerMap
                chargers={chargers}
                selectedCharger={selectedCharger}
                onSelectCharger={(c) => {
                  setSelectedCharger(c);
                  if (sheetState === 'peek') {
                    setSheetState('half');
                  }
                }}
                resizeTrigger={sheetState + mobileTab}
              />
            ) : null}
          </ScopedErrorBoundary>
        </div>

        {/* Draggable Bottom Sheet */}
        <motion.div
          animate={{
            height:
              sheetState === 'peek'
                ? '96px'
                : sheetState === 'half'
                ? '48dvh'
                : '82dvh',
          }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="absolute bottom-0 inset-x-0 z-20 bg-surface/95 backdrop-blur-xl border-t border-border rounded-t-3xl shadow-luxury-xl flex flex-col overscroll-contain"
          style={{ touchAction: 'pan-y' }}
        >
          {/* Sheet Drag Handle & Summary */}
          <div
            onClick={() => {
              if (sheetState === 'peek') setSheetState('half');
              else if (sheetState === 'half') setSheetState('full');
              else setSheetState('peek');
            }}
            className="pt-2.5 pb-2 px-4 cursor-pointer select-none flex flex-col items-center shrink-0 border-b border-border touch-target-min"
          >
            <div className="w-10 h-1.5 rounded-full bg-border-strong mb-2" />
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                <span className="w-2 h-2 rounded-full bg-brand led-pulse-ring" />
                <span>{chargers.length} Verified Bays in Bengaluru</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSheetState(sheetState === 'peek' ? 'half' : sheetState === 'half' ? 'full' : 'peek');
                }}
                className="text-[11px] font-extrabold text-brand bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full uppercase tracking-wider min-h-[36px] flex items-center cursor-pointer"
              >
                {sheetState === 'peek' ? 'Show List' : sheetState === 'half' ? 'Expand' : 'Collapse'}
              </button>
            </div>
          </div>

          {/* Sheet Scrollable List */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 pb-safe scrollbar-thin">
            <ScopedErrorBoundary
              name="MobileChargerList"
              fallbackTitle="Unable to display chargers list"
              fallbackMessage="Click retry to refresh the socket listings."
              onRetry={fetchChargers}
            >
              {apiError ? (
                <DataErrorState
                  error={apiError}
                  title="Couldn't load chargers"
                  onRetry={fetchChargers}
                  className="my-2"
                />
              ) : loading ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => <CardSkeleton key={i} />)
              ) : chargers.length === 0 ? (
                <EmptyState
                  title="No chargers match your criteria"
                  message="Try resetting filters to explore all Bengaluru two-wheeler bays."
                  actionLabel="Reset Filters"
                  onAction={resetFilters}
                />
              ) : (
                chargers.map((charger) => {
                  const isSelected = selectedCharger?._id === charger._id;
                  const bayPhoto = charger.image || (charger.photos && charger.photos[0]) || '';
                  return (
                    <div
                      key={charger._id}
                      onClick={() => setSelectedCharger(charger)}
                      className={`p-4 rounded-2xl bg-surface border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand shadow-luxury-md ring-2 ring-brand/20'
                          : 'border-border shadow-luxury-sm hover:border-brand/40'
                      }`}
                    >
                      <div className="flex gap-3 items-start mb-2">
                        {/* Compact Mobile Bay Thumbnail (72x54) */}
                        <div className="w-[72px] h-[54px] rounded-xl overflow-hidden shrink-0 border border-border shadow-sm bg-bg-soft mt-0.5">
                          <BayImage
                            src={bayPhoto}
                            bayTitle={charger.title}
                            isThumbnail={true}
                            className="w-full h-full"
                            aspectRatio="aspect-[4/3]"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full shrink-0">
                                  <ShieldCheck className="w-3 h-3 text-brand" />
                                  <span>16A Verified</span>
                                </span>
                                <span className="text-[10px] font-semibold text-text-secondary truncate">
                                  {charger.powerKW || 3.3} kW
                                </span>
                              </div>
                              <h4 className="font-editorial text-base font-bold text-text-primary leading-snug truncate">
                                {charger.title}
                              </h4>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-sm font-extrabold text-brand">
                                ₹{charger.price}
                              </div>
                              <span className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">
                                /{charger.pricingType === 'PER_HOUR' ? 'hr' : 'kWh'}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-text-secondary line-clamp-1 mb-1">
                            {charger.address}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                        <span className="text-[11px] font-medium text-brand">
                          Plug & Charge Ready
                        </span>
                        <Link
                          to={`/chargers/${charger._id}`}
                          className="px-3.5 py-2 min-h-[44px] rounded-xl bg-brand hover:opacity-90 text-brand-contrast font-bold text-xs flex items-center gap-1 shadow-luxury-sm cursor-pointer touch-target-min"
                        >
                          <span>Book Slot</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </ScopedErrorBoundary>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
