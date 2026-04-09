import crypto from 'crypto'
import type { WebhookPayload } from '@/lib/webhook-dispatch'

/**
 * Valida URL de webhook definida pelo utilizador (botão inteligente).
 * Bloqueia esquemas inválidos e destinos obviamente privados (mitigação básica de SSRF).
 */
export function validateOutboundWebhookUrl(
  raw: string
): { ok: true; normalizedUrl: string } | { ok: false; message: string } {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, message: 'Informe a URL do webhook' }
  }

  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    return { ok: false, message: 'URL inválida' }
  }

  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, message: 'Use apenas http ou https' }
  }

  const host = u.hostname.toLowerCase()

  if (u.protocol === 'http:') {
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return {
        ok: false,
        message: 'HTTP só é permitido para localhost ou 127.0.0.1 (testes locais)',
      }
    }
  }

  if (isBlockedOutboundHost(host)) {
    return { ok: false, message: 'Este endereço não é permitido' }
  }

  return { ok: true, normalizedUrl: u.toString() }
}

function isBlockedOutboundHost(hostname: string): boolean {
  if (hostname === '0.0.0.0') return true

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const m = hostname.match(ipv4)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    const c = Number(m[3])
    const d = Number(m[4])
    if ([a, b, c, d].some((n) => n > 255)) return true
    if (a === 0) return true
    if (a === 10) return true
    if (a === 169 && b === 254) return true
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 127) {
      return !(b === 0 && c === 0 && d === 1)
    }
    return false
  }

  if (hostname === '::1') return true
  const h = hostname.toLowerCase()
  if (h.startsWith('fc') || h.startsWith('fd')) return true
  if (h.startsWith('fe80:')) return true

  return false
}

/**
 * POST JSON para um endpoint externo (mesmo envelope que `dispatchWebhooks`).
 */
export async function postOutboundWebhook(
  targetUrl: string,
  payload: WebhookPayload,
  secret?: string | null
): Promise<void> {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Organiza-Webhook/1.0',
    'X-Webhook-Event': payload.event,
  }

  if (secret?.trim()) {
    headers['X-Webhook-Signature'] = `sha256=${crypto
      .createHmac('sha256', secret.trim())
      .update(body)
      .digest('hex')}`
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  const res = await fetch(targetUrl, {
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
