import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export interface WebhookPayload {
  event: string
  timestamp: string
  accountId: string
  data: Record<string, unknown>
}

/**
 * Dispara webhooks para uma conta que está inscrita no evento.
 * Executa em background (fire-and-forget) para não bloquear a requisição.
 */
export async function dispatchWebhooks(
  accountId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      accountId,
      events: { contains: event },
    },
  })

  if (webhooks.length === 0) return

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    accountId,
    data,
  }

  const body = JSON.stringify(payload)

  for (const webhook of webhooks) {
    const events = parseEvents(webhook.events)
    if (!events.includes(event)) continue

    // Fire-and-forget - não aguarda resposta
    sendWebhook(webhook.url, webhook.secret, body).catch((err) => {
      console.error(`[Webhook] Falha ao enviar para ${webhook.url}:`, err)
    })
  }
}

function parseEvents(eventsJson: string): string[] {
  try {
    const parsed = JSON.parse(eventsJson) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function sendWebhook(
  url: string,
  secret: string | null,
  body: string
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Organiza-Webhook/1.0',
    'X-Webhook-Event': JSON.parse(body).event,
  }

  if (secret) {
    headers['X-Webhook-Signature'] = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')}`
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal: controller.signal,
  })

  clearTimeout(timeout)

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
}
