import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { PageHeader } from '../../components/common/PageHeader';
import { DataErrorState } from '../../components/common/DataErrorState';
import { useToast } from '../../context/ToastContext';
import {
  Mail,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
} from 'lucide-react';

export const AdminMessagesPage = () => {
  const toast = useToast();

  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminAPI.listContactMessages({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit: 25,
      });
      setMessages(res.data?.messages || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load messages', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await adminAPI.updateContactStatus(id, { status: newStatus });
      toast.success(`Message marked as ${newStatus}`);
      fetchMessages();
    } catch (err) {
      toast.error('Failed to update message status');
    }
  };

  return (
    <div className="pb-24">
      <SEO
        title="Inquiries & Grievances — ChargeShare Back-Office"
        description="Audit customer support requests, host inquiries, and regulatory grievance submissions."
      />

      <PageHeader
        badgeText="Support & Communications"
        badgeVariant="amber"
        badgeSubtext="• Community Inquiries"
        title="Contact Messages & Grievances"
        description="Audit contact submissions, host onboarding questions, and DPDP grievance requests."
        action={
          <button
            type="button"
            onClick={fetchMessages}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
            title="Refresh messages"
            aria-label="Refresh messages"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Inquiries ({total} Total)
          </span>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-2xl bg-surface border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-luxury-sm cursor-pointer"
          >
            <option value="ALL">All Message Statuses</option>
            <option value="NEW">New (Unread)</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved / Replied</option>
          </select>
        </div>

        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Failed to load messages"
            description="We could not retrieve contact messages from the database."
            onRetry={fetchMessages}
          />
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-surface border border-border animate-pulse p-4" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
            <CheckCircle2 className="w-10 h-10 text-brand mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-text-primary">Inbox is clear</h3>
            <p className="text-xs text-text-secondary">No inquiries matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m._id}
                className="p-5 rounded-3xl bg-surface border border-border hover:border-amber-500/30 transition-all shadow-luxury-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-text-primary uppercase tracking-wider text-xs">
                      {m.subject}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        m.status === 'RESOLVED'
                          ? 'bg-brand/10 text-brand border-brand/20'
                          : m.status === 'IN_REVIEW'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <p className="text-text-secondary leading-relaxed bg-bg-soft p-3 rounded-2xl border border-border">
                    &quot;{m.message}&quot;
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-text-muted">
                    <span>From: <strong className="text-text-primary">{m.name}</strong></span>
                    <span>•</span>
                    <span>Email: <a href={`mailto:${m.email}`} className="text-brand hover:underline">{m.email}</a></span>
                    {m.phone && (
                      <>
                        <span>•</span>
                        <span>Phone: {m.phone}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Received: {new Date(m.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {m.status !== 'RESOLVED' ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(m._id, 'RESOLVED')}
                      className="px-4 py-2 min-h-[40px] rounded-2xl bg-brand text-brand-contrast font-bold text-xs hover:opacity-90 transition-all shadow-luxury-sm cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(m._id, 'IN_REVIEW')}
                      className="px-4 py-2 min-h-[40px] rounded-2xl bg-surface border border-border text-text-secondary font-bold text-xs hover:bg-bg-elevated transition-colors cursor-pointer"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
