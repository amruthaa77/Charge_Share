import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { PageHeader } from '../../components/common/PageHeader';
import { DataErrorState } from '../../components/common/DataErrorState';
import {
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminAPI.listPayments({ page, limit: 25 });
      setPayments(res.data?.payments || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to load payments', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div className="pb-24">
      <SEO
        title="Payments, Fees & Refunds — ChargeShare Back-Office"
        description="Audit gateway transactions, track 5% platform fees, and verify automated refunds."
      />

      <PageHeader
        badgeText="Financial Telemetry"
        badgeVariant="amber"
        badgeSubtext="• Razorpay Gateway & Ledger"
        title="Payments, Fees & Refunds"
        description="Audit transaction integrity, monitor 5% platform facilitation fees, and inspect processed refunds."
        action={
          <button
            type="button"
            onClick={fetchPayments}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-surface border border-border text-text-primary hover:bg-bg-elevated transition-colors shadow-luxury-sm cursor-pointer touch-target-min"
            title="Refresh payments"
            aria-label="Refresh payments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Failed to load payments"
            description="We could not retrieve financial ledger entries from the database."
            onRetry={fetchPayments}
          />
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-3xl bg-surface border border-border animate-pulse p-4" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
            <CreditCard className="w-10 h-10 text-brand mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-text-primary">No payment records</h3>
            <p className="text-xs text-text-secondary">No financial transactions have been completed yet.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-4xl border border-border shadow-luxury-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between text-xs font-bold text-text-muted">
              <span>Showing {payments.length} of {total} Transactions</span>
              <span className="text-[11px] text-brand">5% Automated Platform Fee</span>
            </div>

            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div
                  key={p._id}
                  className="p-5 hover:bg-bg-soft transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-bold text-text-primary">
                        {p.bookingCode}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.paymentStatus === 'PAID'
                            ? 'bg-brand/10 text-brand border-brand/20'
                            : p.paymentStatus === 'REFUNDED'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </div>

                    <p className="text-text-secondary truncate">
                      Payer: <strong className="text-text-primary">{p.userId?.name}</strong> •{' '}
                      Host Payout: <strong>{p.hostId?.name}</strong> • Station: {p.chargerId?.title || '16A Bay'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted font-mono">
                      <span>Gateway Order: {p.razorpayOrderId || 'N/A (Mock/Direct)'}</span>
                      <span>•</span>
                      <span>Date: {new Date(p.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <div className="font-editorial text-base font-bold text-text-primary">
                        ₹{p.totalAmount}
                      </div>
                      <div className="text-[11px] text-brand font-semibold">
                        Platform Fee: ₹{p.platformFee}
                      </div>
                      {p.refundAmount > 0 && (
                        <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                          Refunded: ₹{p.refundAmount}
                        </div>
                      )}
                    </div>
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
