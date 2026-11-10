import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone, MapPin, Send, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { SEO } from '../components/common/SEO';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { applyServerErrors } from '../utils/errorMapper';

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(/^(\+91[-\s]?)?[0]?(91)?[6789]\d{9}$/, 'Please enter a valid Indian mobile number (e.g. +91 9876543210)')
    .optional()
    .or(z.literal('')),
  subject: z.enum([
    'GENERAL_INQUIRY',
    'HOSTING_SUPPORT',
    'BOOKING_ISSUE',
    'SAFETY_CONCERN',
    'PARTNERSHIP',
    'GRIEVANCE',
  ]),
  message: z.string().min(10, 'Please write at least 10 characters').max(2000),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'You must provide consent to submit this inquiry' }),
  }),
});

export const ContactPage = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [formError, setFormError] = useState(null);

  const form = useForm({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: 'GENERAL_INQUIRY',
      message: '',
      consentGiven: false,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const onSubmit = async (data) => {
    setFormError(null);
    try {
      setIsSubmitting(true);
      const res = await api.post('/contact', data);
      setSubmittedTicket(res.data.ticketId || 'CONFIRMED');
      toast.success(
        `Ticket #${res.data.ticketId || ''} created. We will respond within 24-48 hours.`,
        'Inquiry Submitted'
      );
      reset();
    } catch (err) {
      applyServerErrors(form, err);
      setFormError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-text-primary py-16 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Contact Us & Grievance Desk — ChargeShare Bengaluru"
        description="Reach out to ChargeShare India support or our designated DPDP Act 2023 Grievance Desk in Bengaluru. Phone: +91 80 2555 0199."
        canonical="/contact"
      />

      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold border border-brand/20">
            <Mail className="w-3.5 h-3.5 text-brand" />
            <span>Bengaluru Operations Desk</span>
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-text-primary tracking-tight">
            Get in Touch
          </h1>
          <p className="text-sm text-text-secondary max-w-xl mx-auto">
            Questions regarding 16A two-wheeler bays, host onboarding, or statutory DPDP Act 2023 data inquiries? Our Bengaluru team is here to assist.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface border border-border rounded-4xl p-6 sm:p-8 shadow-luxury-sm space-y-5 text-xs text-text-secondary">
              <h3 className="font-editorial text-lg font-bold text-text-primary">
                Support & Grievance Desk
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-text-primary">Registered Office:</strong>
                    <span>100ft Road, Indiranagar, Bengaluru, Karnataka 560038</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-text-primary">Direct Telephone:</strong>
                    <a href="tel:+918025550199" className="text-brand hover:underline">
                      +91 80 2555 0199
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-text-primary">Electronic Mail:</strong>
                    <a href="mailto:support@chargeshare.in" className="text-brand hover:underline">
                      support@chargeshare.in
                    </a>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-bg border border-border space-y-1">
                <span className="font-bold text-text-primary block">Operating Hours:</span>
                <p className="text-[11px] text-text-secondary">
                  Monday to Saturday: 08:00 – 20:00 IST. Emergency SOS response available 24/7.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-surface border border-border rounded-4xl p-6 sm:p-10 shadow-luxury-sm">
              {submittedTicket ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-editorial text-2xl font-bold text-text-primary">
                    Inquiry Received
                  </h3>
                  <p className="text-xs text-text-secondary max-w-sm mx-auto">
                    Your inquiry has been logged under ticket reference{' '}
                    <strong className="text-text-primary">#{submittedTicket}</strong>. We will respond within 24-48 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedTicket(null)}
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand text-brand-contrast font-bold text-xs shadow-luxury-sm hover:brightness-110 touch-target-min"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
                  {formError && (
                    <ErrorAlert
                      error={formError}
                      onDismiss={() => setFormError(null)}
                      className="mb-4"
                    />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contactName" className="text-xs font-bold text-text-primary block mb-1">
                        Your Full Name:
                      </label>
                      <input
                        id="contactName"
                        type="text"
                        {...register('name')}
                        placeholder="Ananya Sharma"
                        className="w-full p-3 rounded-2xl border border-border text-xs text-text-primary bg-surface"
                      />
                      {errors.name && <p className="text-rose-500 text-[11px] mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                      <label htmlFor="contactEmail" className="text-xs font-bold text-text-primary block mb-1">
                        Email Address:
                      </label>
                      <input
                        id="contactEmail"
                        type="email"
                        {...register('email')}
                        placeholder="ananya@example.com"
                        className="w-full p-3 rounded-2xl border border-border text-xs text-text-primary bg-surface"
                      />
                      {errors.email && <p className="text-rose-500 text-[11px] mt-1">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contactPhone" className="text-xs font-bold text-text-primary block mb-1">
                        Mobile Number (Optional):
                      </label>
                      <input
                        id="contactPhone"
                        type="tel"
                        {...register('phone')}
                        placeholder="+91 98765 43210"
                        className="w-full p-3 rounded-2xl border border-border text-xs text-text-primary bg-surface"
                      />
                      {errors.phone && <p className="text-rose-500 text-[11px] mt-1">{errors.phone.message}</p>}
                    </div>

                    <div>
                      <label htmlFor="contactSubject" className="text-xs font-bold text-text-primary block mb-1">
                        Subject / Department:
                      </label>
                      <select
                        id="contactSubject"
                        {...register('subject')}
                        className="w-full p-3 rounded-2xl border border-border text-xs text-text-primary bg-surface"
                      >
                        <option value="GENERAL_INQUIRY">General Inquiry</option>
                        <option value="HOSTING_SUPPORT">16A Socket Hosting Support</option>
                        <option value="BOOKING_ISSUE">Two-Wheeler Booking Issue</option>
                        <option value="SAFETY_CONCERN">Electrical Safety / Earthing Concern</option>
                        <option value="PARTNERSHIP">Apartment RWA / Society Partnership</option>
                        <option value="GRIEVANCE">DPDP Act 2023 Statutory Grievance</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contactMsg" className="text-xs font-bold text-text-primary block mb-1">
                      Message (Minimum 10 characters):
                    </label>
                    <textarea
                      id="contactMsg"
                      rows="4"
                      {...register('message')}
                      placeholder="Please describe your question or issue in detail..."
                      className="w-full p-3 rounded-2xl border border-border text-xs text-text-primary bg-surface"
                    />
                    {errors.message && <p className="text-rose-500 text-[11px] mt-1">{errors.message.message}</p>}
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer font-semibold text-text-primary pt-1">
                    <input
                      type="checkbox"
                      {...register('consentGiven')}
                      className="rounded accent-brand w-4 h-4 mt-0.5"
                    />
                    <span>
                      I authorize ChargeShare India to process my submitted contact details to respond to this inquiry.
                    </span>
                  </label>
                  {errors.consentGiven && (
                    <p className="text-rose-500 text-[11px]">{errors.consentGiven.message}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 min-h-[44px] rounded-2xl bg-brand hover:brightness-110 text-brand-contrast font-bold text-xs transition-all shadow-luxury-sm flex items-center justify-center gap-2 disabled:opacity-50 touch-target-min"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Transmitting Ticket...' : 'Send Inquiry Message'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
