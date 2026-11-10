import React from 'react';
import { ShieldCheck, Zap, AlertCircle, Clock, CheckCircle2, Bike, Car } from 'lucide-react';

export const Badge = ({
  children,
  variant = 'default',
  size = 'sm',
  icon: Icon,
  pulseDot = false,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'text-[11px] px-2 py-0.5 rounded-md font-medium',
    sm: 'text-xs px-2.5 py-1 rounded-full font-medium',
    md: 'text-sm px-3 py-1.5 rounded-full font-semibold',
  };

  const variants = {
    default:
      'bg-bg-elevated text-text-secondary border border-border',
    verified:
      'bg-brand/10 text-brand border border-brand/25 shadow-sm',
    eco:
      'bg-brand/15 text-brand border border-brand/25 font-semibold',
    lime:
      'bg-brand/15 text-brand border border-brand/25 font-semibold',
    electric:
      'bg-brand/15 text-brand border border-brand/25 font-semibold',
    warning:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    danger:
      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    info:
      'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25',
    purple:
      'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} ${variants[variant] || variants.default} backdrop-blur-sm ${className}`}
    >
      {pulseDot && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
        </span>
      )}
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export const VerifiedBadge = ({ size = 'sm', className = '' }) => (
  <Badge variant="verified" size={size} icon={ShieldCheck} className={className}>
    Verified Host
  </Badge>
);

export const VehicleCategoryBadge = ({ category = 'BIKE', size = 'xs', className = '' }) => {
  if (category === 'BIKE' || category === 'TWO_WHEELER') {
    return (
      <Badge variant="eco" size={size} icon={Bike} className={className}>
        EV Bike / Scooter
      </Badge>
    );
  }
  return (
    <Badge variant="default" size={size} icon={Car} className={className}>
      EV Car
    </Badge>
  );
};

export const ConnectorBadge = ({ type, className = '' }) => {
  return (
    <Badge variant="eco" size="xs" icon={Zap} className={className}>
      {type}
    </Badge>
  );
};

export const BookingStatusBadge = ({ status }) => {
  switch (status) {
    case 'CONFIRMED':
      return (
        <Badge variant="verified" icon={CheckCircle2} pulseDot>
          Confirmed
        </Badge>
      );
    case 'PENDING_PAYMENT':
      return (
        <Badge variant="warning" icon={Clock}>
          Pending Payment
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="electric" icon={CheckCircle2}>
          Completed
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="danger" icon={AlertCircle}>
          Cancelled
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="danger" icon={AlertCircle}>
          Rejected
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
};
