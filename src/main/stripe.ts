import { GIEO_SECRETS } from './gieo-config'

const STRIPE_SECRET_KEY = GIEO_SECRETS.stripe.secretKey

export function isStripeConfigured(): boolean {
  return (
    (STRIPE_SECRET_KEY.startsWith('sk_test_') || STRIPE_SECRET_KEY.startsWith('sk_live_')) &&
    !STRIPE_SECRET_KEY.includes('REPLACE_WITH')
  )
}

async function stripeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, string>
): Promise<{ data?: T; error?: string }> {
  if (!isStripeConfigured()) {
    return { error: 'Stripe not configured — add sk_test_… key in src/main/gieo-config.ts' }
  }

  try {
    const url = new URL(`https://api.stripe.com/v1${path}`)
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      signal: AbortSignal.timeout(30000)
    }

    if (method === 'GET' && params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    } else if (method === 'POST' && params) {
      init.body = new URLSearchParams(params).toString()
    }

    const res = await fetch(url.toString(), init)
    const json = (await res.json()) as T & { error?: { message?: string } }
    if (!res.ok) {
      return { error: json.error?.message ?? `Stripe ${res.status}` }
    }
    return { data: json }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export interface StripeInvoiceSummary {
  id: string
  customer_email: string | null
  customer_name: string | null
  amount_due: number
  amount_paid: number
  status: string | null
  hosted_invoice_url: string | null
  created: number
}

export async function listStripeInvoices(limit = 25): Promise<{
  invoices?: StripeInvoiceSummary[]
  error?: string
}> {
  const result = await stripeRequest<{ data: StripeInvoiceSummary[] }>('GET', '/invoices', {
    limit: String(limit)
  })
  if (result.error) return { error: result.error }
  return { invoices: result.data?.data ?? [] }
}

export async function createStripePaymentLink(input: {
  amountCents: number
  clientName: string
  clientEmail?: string
}): Promise<{ url?: string; error?: string }> {
  const params: Record<string, string> = {
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(input.amountCents),
    'line_items[0][price_data][product_data][name]': `GIEO Retainer — ${input.clientName}`,
    'line_items[0][quantity]': '1'
  }

  if (input.clientEmail) {
    params['metadata[client_email]'] = input.clientEmail
  }

  const result = await stripeRequest<{ url: string }>('POST', '/payment_links', params)
  if (result.error) return { error: result.error }
  return { url: result.data?.url }
}

export async function getStripeStatus(): Promise<{ configured: boolean }> {
  return { configured: isStripeConfigured() }
}
