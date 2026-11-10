import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { PageHeader } from '../../components/common/PageHeader';
import { DataErrorState } from '../../components/common/DataErrorState';
import {
  Users,
  ShieldCheck,
  Zap,
  Calendar,
  CreditCard,
  Flag,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const AdminOverviewPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminAPI.getStats();
      setStats(res.data?.stats || null);
    } catch (err) {
      console.error('Failed to load overview stats', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="pb-24">
      <SEO
        title="Admin Back-Office Overview — ChargeShare Bengaluru"
        description="Comprehensive platform metrics, safety audits, and real-time network operations."
      />

      {/* Unified Page Header */}
      <PageHeader
        badgeText="Back-Office Operations"
        badgeVariant="amber"
        badgeSubtext="• Real-Time Database Metrics"
        title="Command & Compliance Overview"
        description="Monitor network liquidity, audit queue health, booking volume, and real-time revenue."
        action={
          <button
            type="button"
            onClick={fetchStats}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
            title="Refresh metrics"
            aria-label="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Unable to load platform metrics"
            description="We encountered an issue querying the database metrics. Please retry."
            onRetry={fetchStats}
          />
        ) : loading && !stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-32 rounded-3xl bg-surface border border-border animate-pulse p-6" />
            ))}
          </div>
        ) : (
          <>
            {/* =========================================================================
                PRIMARY KPI CARDS (Computed directly from Database)
                ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Total Users split */}
              <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Total Users
                </span>
                <div className="font-editorial text-3xl font-bold text-text-primary">
                  {stats?.users?.total ?? 0}
                </div>
                <div className="text-[11px] text-text-secondary flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                  <span className="text-brand font-semibold">{stats?.users?.evOwners ?? 0} Riders</span>
                  <span>•</span>
                  <span className="text-accent font-semibold">{stats?.users?.hosts ?? 0} Hosts</span>
                  <span>•</span>
                  <span className="text-text-muted">{stats?.users?.admins ?? 0} Admins</span>
                </div>
              </div>

              {/* Pending KYC with oldest waiting age */}
              <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Pending KYC Audits
                </span>
                <div className="font-editorial text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {stats?.verifications?.pending ?? 0}
                </div>
                <div className="text-[11px] text-text-secondary flex items-center gap-1.5 pt-1 border-t border-border">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Oldest wait: <strong className="text-text-primary">{stats?.verifications?.oldestWaitingHours ?? 0}h</strong>
                  </span>
                </div>
              </div>

              {/* Verified 16A Bays */}
              <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Verified 16A Bays
                </span>
                <div className="font-editorial text-3xl font-bold text-brand">
                  {stats?.chargers?.verified ?? 0}
                </div>
                <div className="text-[11px] text-text-secondary pt-1 border-t border-border truncate">
                  <span>
                    Top Hubs: {stats?.chargers?.topAreas?.length ? stats.chargers.topAreas.join(', ') : 'Bengaluru'}
                  </span>
                </div>
              </div>

              {/* Open Bay Defect Reports */}
              <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Open Defect Reports
                </span>
                <div className="font-editorial text-3xl font-bold text-rose-600 dark:text-rose-400">
                  {stats?.reports?.open ?? 0}
                </div>
                <div className="text-[11px] text-rose-600 dark:text-rose-400 pt-1 border-t border-border font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Hardware & safety triage</span>
                </div>
              </div>

              {/* Bookings Volume */}
              <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Bookings Volume
                </span>
                <div className="font-editorial text-3xl font-bold text-text-primary">
                  {stats?.bookings?.total ?? 0}
                </div>
                <div className="text-[11px] text-text-secondary flex items-center gap-2 pt-1 border-t border-border">
                  <span className="text-brand font-semibold">{stats?.bookings?.today ?? 0} today</span>
                  <span>•</span>
                  <span>{stats?.bookings?.thisWeek ?? 0} this week</span>
                </div>
              </div>

              {/* Gross Booking Value */}
              <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Gross Booking Value
                </span>
                <div className="font-editorial text-3xl font-bold text-brand">
                  ₹{(stats?.financial?.grossBookingValue ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-text-secondary pt-1 border-t border-border">
                  <span>Host Payouts: ₹{(stats?.financial?.hostPayouts ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Platform Fee Revenue (5%) */}
              <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Platform Fee Revenue (5%)
                </span>
                <div className="font-editorial text-3xl font-bold text-accent">
                  ₹{(stats?.financial?.platformRevenue ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-text-secondary pt-1 border-t border-border">
                  <span>Refunds: ₹{(stats?.financial?.refundsIssued ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Failed Payments (7d) */}
              <div className="p-6 rounded-3xl bg-surface border border-border shadow-luxury-sm space-y-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Failed Payments (7 Days)
                </span>
                <div className="font-editorial text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {stats?.payments?.failedLast7Days ?? 0}
                </div>
                <div className="text-[11px] text-text-secondary pt-1 border-t border-border">
                  <span>Gateway drop-off monitoring</span>
                </div>
              </div>
            </div>

            {/* =========================================================================
                "NEEDS ATTENTION" ACTIONABLE QUEUE & 30-DAY TRENDS
                ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Needs Attention Column */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" /> Needs Attention
                  </h3>
                  <span className="text-[11px] font-bold text-text-muted">
                    {stats?.needsAttention?.length ?? 0} Pending Items
                  </span>
                </div>

                <div className="space-y-3">
                  {!stats?.needsAttention || stats.needsAttention.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-surface border border-border text-center text-xs text-text-muted space-y-2">
                      <ShieldCheck className="w-8 h-8 text-brand mx-auto" />
                      <p className="font-semibold text-text-primary">All Queues Operational</p>
                      <p>No overdue KYC audits or open critical reports.</p>
                    </div>
                  ) : (
                    stats.needsAttention.map((item) => (
                      <Link
                        key={item.id}
                        to={item.link}
                        className="p-4 rounded-2xl bg-surface border border-border hover:border-amber-500/40 shadow-luxury-sm hover:shadow-luxury transition-all block group space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.severity === 'HIGH'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {item.category} • {item.severity}
                          </span>
                          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
                        </div>
                        <h4 className="font-editorial text-sm font-bold text-text-primary group-hover:text-brand transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {item.description}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* 30-Day Booking Trends Chart */}
              <div className="lg:col-span-2 rounded-3xl bg-surface border border-border shadow-luxury-sm p-6 space-y-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-editorial text-xl font-bold text-text-primary flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-brand" /> 30-Day Network Activity
                    </h3>
                    <p className="text-xs text-text-secondary">Daily completed charging sessions across Bengaluru</p>
                  </div>
                  <span className="text-xs font-semibold text-brand bg-brand/10 px-3 py-1 rounded-xl">
                    Live Telemetry
                  </span>
                </div>

                {/* Simplified Accessible Bar Visualization */}
                <div className="pt-6 pb-2">
                  {!stats?.trends30Days || stats.trends30Days.length === 0 ? (
                    <div className="h-44 flex items-center justify-center text-xs text-text-muted">
                      No booking telemetry recorded in the last 30 days.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-end gap-1.5 h-44 w-full pt-4 overflow-x-auto">
                        {stats.trends30Days.map((day) => {
                          const maxCount = Math.max(...stats.trends30Days.map((d) => d.bookingsCount), 1);
                          const heightPercent = Math.max(Math.round((day.bookingsCount / maxCount) * 100), 8);
                          return (
                            <div
                              key={day._id}
                              className="flex-1 min-w-[8px] flex flex-col items-center gap-1 group relative h-full justify-end"
                            >
                              {/* Hover tooltip */}
                              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-lg">
                                {day._id}: {day.bookingsCount} booking(s) (₹{day.amount || 0})
                              </div>
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className="w-full rounded-t-md bg-brand/70 group-hover:bg-brand transition-all"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-text-muted border-t border-border pt-2 font-mono">
                        <span>{stats.trends30Days[0]?._id}</span>
                        <span>30-Day Window</span>
                        <span>{stats.trends30Days[stats.trends30Days.length - 1]?._id}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
