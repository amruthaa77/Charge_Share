import { z } from 'zod';

export const submitVerificationSchema = z.object({
  chargerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid charger ID format'),
  idProofType: z.enum(['AADHAAR', 'PAN', 'DRIVING_LICENSE', 'PASSPORT']),
  idProofUrl: z.string().min(1, 'ID proof document is required'),
  propertyProofType: z.enum(['ELECTRICITY_BILL', 'PROPERTY_TAX', 'SALE_DEED', 'RENTAL_AGREEMENT_NOC', 'SOCIETY_NOC']),
  propertyProofUrl: z.string().min(1, 'Property proof document is required'),
  nocDocumentUrl: z.string().optional().default(''),
  safetyChecklist: z.object({
    earthingVerified: z.boolean(),
    mcbRccbInstalled: z.boolean(),
    weatherproofProtection: z.boolean(),
    cctvSurveillance: z.boolean().optional().default(false),
    fireExtinguisherNearby: z.boolean().optional().default(false),
  }),
  propertyConsentDeclared: z.literal(true, {
    errorMap: () => ({ message: 'You must formally declare property consent/ownership to submit verification' }),
  }),
});

export const adminReviewSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED', 'RESUBMISSION_REQUESTED']),
    feedback: z.string().max(500).optional().default(''),
    rejectionReason: z.string().max(500).optional().default(''),
    rejectionPreset: z.string().optional().default(''),
    resubmissionNotes: z.string().max(500).optional().default(''),
    reviewChecklist: z
      .object({
        documentsLegible: z.boolean().optional().default(false),
        nameMatches: z.boolean().optional().default(false),
        addressMatchesBay: z.boolean().optional().default(false),
        nocPresentForApartments: z.boolean().optional().default(false),
        earthingDeclared: z.boolean().optional().default(false),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'REJECTED') {
        const reason = (data.rejectionReason || data.feedback || '').trim();
        return reason.length >= 10;
      }
      return true;
    },
    {
      message: 'Rejection requires a detailed reason of at least 10 characters',
      path: ['rejectionReason'],
    }
  )
  .refine(
    (data) => {
      if (data.status === 'APPROVED' && data.reviewChecklist) {
        const { documentsLegible, nameMatches, addressMatchesBay, nocPresentForApartments, earthingDeclared } = data.reviewChecklist;
        return Boolean(documentsLegible && nameMatches && addressMatchesBay && nocPresentForApartments && earthingDeclared);
      }
      return true;
    },
    {
      message: 'All 5 verification checklist criteria are mandatory before approving a socket',
      path: ['reviewChecklist'],
    }
  );
