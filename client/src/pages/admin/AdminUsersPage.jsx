import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { PageHeader } from '../../components/common/PageHeader';
import { DataErrorState } from '../../components/common/DataErrorState';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Search,
  Filter,
  Download,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';

export const AdminUsersPage = () => {
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [trustFilter, setTrustFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminAPI.listUsers({
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        trustStatus: trustFilter !== 'ALL' ? trustFilter : undefined,
        search: search.trim() || undefined,
        sort: sortOrder,
        page,
        limit: 20,
      });
      setUsers(res.data?.users || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load users list', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, trustFilter, search, sortOrder, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle CSV Export
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await adminAPI.exportUsersCSV();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chargeshare_users_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Users list exported to CSV successfully.');
    } catch (err) {
      toast.error('Failed to export users CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="pb-24">
      <SEO
        title="User Legitimacy & Risk Review — ChargeShare Back-Office"
        description="Audit platform participants, inspect telemetry risk signals, and review account standing."
      />

      <PageHeader
        badgeText="User Identity & Risk"
        badgeVariant="amber"
        badgeSubtext="• Legitimacy Triage"
        title="User Legitimacy & Standing"
        description="Inspect telemetry risk signals, verify KYC state, review booking disputes, and manage account trust."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportCSV}
              className="px-4 py-2 min-h-[44px] rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated font-semibold text-xs transition-colors shadow-luxury-sm flex items-center gap-1.5 cursor-pointer touch-target-min disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-brand" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <button
              type="button"
              onClick={fetchUsers}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
              title="Refresh users"
              aria-label="Refresh users"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* FILTERS & SEARCH BAR */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, or phone number..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-2xl bg-surface border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="EV_OWNER">Riders (EV Owners)</option>
              <option value="HOST">Hosts (Socket Owners)</option>
              <option value="ADMIN">Administrators</option>
            </select>

            {/* Trust status filter */}
            <select
              value={trustFilter}
              onChange={(e) => {
                setTrustFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-2xl bg-surface border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm cursor-pointer"
            >
              <option value="ALL">All Trust Standings</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="FLAGGED">Flagged</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            {/* Sort order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-surface border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm cursor-pointer"
            >
              <option value="newest">Joined: Newest</option>
              <option value="oldest">Joined: Oldest</option>
            </select>
          </div>
        </div>

        {/* USERS TABLE / LIST */}
        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Failed to load users"
            description="We could not retrieve the platform user accounts from the database."
            onRetry={fetchUsers}
          />
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 rounded-3xl bg-surface border border-border animate-pulse p-4" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
            <Users className="w-10 h-10 text-brand mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-text-primary">No users found</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              No platform accounts matched your search and filter criteria.
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-4xl border border-border shadow-luxury-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between text-xs font-bold text-text-muted">
              <span>Showing {users.length} of {total} Users</span>
              <span className="text-[11px] text-text-muted">Sensitive PII masked for privacy compliance</span>
            </div>

            <div className="divide-y divide-border">
              {users.map((u) => (
                <div
                  key={u._id}
                  className="p-5 hover:bg-bg-soft transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left user identity */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        to={`/admin/users/${u._id}`}
                        className="font-editorial text-base font-bold text-text-primary hover:text-brand transition-colors"
                      >
                        {u.name}
                      </Link>

                      {/* Role Badge */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-bg-elevated border border-border text-text-secondary uppercase">
                        {u.role === 'EV_OWNER' ? 'Rider' : u.role}
                      </span>

                      {/* Trust Status Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.trustStatus === 'VERIFIED'
                            ? 'bg-brand/10 text-brand border-brand/20'
                            : u.trustStatus === 'SUSPENDED'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : u.trustStatus === 'FLAGGED'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : u.trustStatus === 'UNDER_REVIEW'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-bg-soft text-text-muted border-border'
                        }`}
                      >
                        {u.trustStatus}
                      </span>
                    </div>

                    <div className="text-xs text-text-secondary flex flex-wrap items-center gap-2">
                      <span>{u.maskedEmail}</span>
                      <span>•</span>
                      <span>{u.maskedPhone}</span>
                      <span>•</span>
                      <span className="text-[11px] text-text-muted">
                        Joined {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    {/* Risk Signals Chips */}
                    {u.signals && u.signals.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-text-muted">Risk Signals:</span>
                        {u.signals.map((sig) => (
                          <span
                            key={sig.code}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                              sig.severity === 'HIGH'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {sig.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right metrics and Action button */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                    <div className="flex items-center gap-4 text-center text-xs">
                      <div>
                        <div className="font-bold text-text-primary">{u.bookingsCount}</div>
                        <div className="text-[10px] text-text-muted">Bookings</div>
                      </div>
                      <div>
                        <div className={`font-bold ${u.cancellationRate > 30 ? 'text-rose-500' : 'text-text-primary'}`}>
                          {u.cancellationRate}%
                        </div>
                        <div className="text-[10px] text-text-muted">Cancel Rate</div>
                      </div>
                      <div>
                        <div className={`font-bold ${u.reportsCount > 0 ? 'text-amber-500' : 'text-text-primary'}`}>
                          {u.reportsCount}
                        </div>
                        <div className="text-[10px] text-text-muted">Reports</div>
                      </div>
                    </div>

                    <Link
                      to={`/admin/users/${u._id}`}
                      className="px-4 py-2 min-h-[40px] rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review Standing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
