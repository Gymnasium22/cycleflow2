// @ts-nocheck
/**
 * Telegram Stars product catalog.
 * Currency is always XTR. provider_token must be empty string for Stars.
 *
 * Subscription notes (Bot API):
 * - subscription_period must be 2592000 (30 days) when used
 * - max 10000 Stars per subscription charge
 */

export type Product = {
  id: string
  title: string
  description: string
  stars: number
  /** 'subscription' uses Telegram recurring Stars subscription (30 days) */
  kind: 'subscription' | 'one_time'
  /** Days of premium to grant on success (one_time multi-month too) */
  premiumDays?: number
  /** Doctor report PDF credits */
  reportCredits?: number
  subscriptionPeriod?: number
}

export const PRODUCTS: Record<string, Product> = {
  premium_1m: {
    id: 'premium_1m',
    title: 'Kolechko Premium — 1 month',
    description: 'Unlimited history, advanced insights, priority reminders, full doctor PDF.',
    stars: 250,
    // one_time is more compatible across bots; premium_until still extended 30 days on webhook
    kind: 'one_time',
    premiumDays: 30,
  },
  premium_3m: {
    id: 'premium_3m',
    title: 'Kolechko Premium — 3 months',
    description: 'Three months of Premium at a better rate. Full analytics and exports.',
    stars: 600,
    kind: 'one_time',
    premiumDays: 90,
  },
  doctor_report: {
    id: 'doctor_report',
    title: 'Full doctor report',
    description: 'One detailed PDF report ready to share with your clinician.',
    stars: 75,
    kind: 'one_time',
    reportCredits: 1,
  },
}

export function getProduct(productId: string): Product | null {
  return PRODUCTS[productId] || null
}

/** Build opaque invoice payload: productId:userId:timestamp */
export function buildInvoicePayload(productId: string, userId: string): string {
  return `${productId}:${userId}:${Date.now()}`
}

export function parseInvoicePayload(payload: string): {
  productId: string
  userId: string
  ts: string
} | null {
  const parts = (payload || '').split(':')
  if (parts.length < 3) return null
  const [productId, userId, ts] = parts
  if (!productId || !userId) return null
  return { productId, userId, ts }
}
