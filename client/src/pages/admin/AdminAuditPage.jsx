import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { PageHeader } from '../../components/common/PageHeader';
import { DataErrorState } from '../../components/common/DataErrorState';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react';

export const AdminAuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminAPI.getAuditLogs({
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        search: search.trim() || undefined,
        page,
        limit: 30,
      });
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, search, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="pb-24">
      <SEO
        title="Administrative Audit Trail — ChargeShare Back-Office"
        description="Immutable system audit records of all administrative actions, KYC decisions, and document views."
      />

      <PageHeader
        badgeText="Security & Compliance"
        badgeVariant="amber"
        badgeSubtext="• Immutable Audit Trail"
        title="Administrative Audit Trail"
        description="Every admin action, KYC approval, suspension, document view, and data export is permanently logged."
        action={
          <button
            type="button"
            onClick={fetchLogs}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
            title="Refresh audit log"
            aria-label="Refresh audit log"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by admin email or reason..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 rounded-2xl bg-surface border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm cursor-pointer"
          >
            <option value="ALL">All Administrative Actions</option>
            <option value="KYC_APPROVE">KYC Approve</option>
            <option value="KYC_REJECT">KYC Reject</option>
            <option value="KYC_REQUEST_INFO">KYC Request More Info</option>
            <option value="DOCUMENT_VIEW">Document View / Audit</option>
            <option value="USER_TRUST_CHANGE">User Trust Status Change</option>
            <option value="USER_SUSPEND">User Suspension</option>
            <option value="USER_NOTE_ADD">Admin Note Added</option>
            <option value="LISTING_SUSPEND">Listing Suspended</option>
            <option value="LISTING_RELIST">Listing Re-listed</option>
            <option value="REPORT_RESOLVE">Report Resolved</option>
            <option value="DATA_EXPORT">Data Export</option>
            <option value="ADMIN_CREATE">Admin Created</option>
          </select>
        </div>

        {/* Audit Log Table */}
        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Failed to load audit logs"
            description="We could not retrieve security audit records from the database."
            onRetry={fetchLogs}
          />
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-3xl bg-surface border border-border animate-pulse p-4" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
            <FileText className="w-10 h-10 text-brand mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-text-primary">No audit records found</h3>
            <p className="text-xs text-text-secondary">No recorded actions matching your filter criteria.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-4xl border border-border shadow-luxury-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between text-xs font-bold text-text-muted">
              <span>Showing {logs.length} of {total} Log Entries</span>
              <span className="text-[11px] text-text-muted">Immutable DPDP / ISO 27001 Log</span>
            </div>

            <div className="divide-y divide-border font-sans">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="p-4 hover:bg-bg-soft transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {log.action}
                      </span>
                      <strong className="text-text-primary">{log.targetType}</strong>
                      {log.targetIdentifier && (
                        <span className="text-text-secondary">({log.targetIdentifier})</span>
                      )}
                    </div>

                    {log.reason && (
                      <p className="text-text-secondary text-[11px]">
                        Reason: &quot;{log.reason}&quot;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
                      <span>Actor: <strong>{log.actorEmail}</strong></span>
                      {log.ipAddress && (
                        <>
                          <span>•</span>
                          <span className="font-mono">IP: {log.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-text-muted shrink-0">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span>{new Date(log.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
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
