/** Metadados internos do cliente: só API REST + webhooks; não expor no tRPC. */

export const MAX_INTERNAL_METADATA_BYTES = 64 * 1024

export function parseInternalMetadataFromDb(
  raw: string | null | undefined
): Record<string, unknown> | null {
  if (raw == null || raw === '') return null
  try {
    const v = JSON.parse(raw) as unknown
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

export type InternalMetadataValidation =
  | { ok: true; mode: 'omit' }
  | { ok: true; mode: 'set'; serialized: string | null }
  | { ok: false; message: string }

/**
 * Valida `internal_metadata` no body: ausente = omitir;
 * null = limpar; objeto = persistir JSON; outros = erro.
 */
export function validateInternalMetadataBody(body: Record<string, unknown>): InternalMetadataValidation {
  if (!Object.prototype.hasOwnProperty.call(body, 'internal_metadata')) {
    return { ok: true, mode: 'omit' }
  }
  const value = body.internal_metadata
  if (value === null) {
    return { ok: true, mode: 'set', serialized: null }
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, message: 'internal_metadata deve ser um objeto JSON ou null' }
  }
  const serialized = JSON.stringify(value)
  if (serialized.length > MAX_INTERNAL_METADATA_BYTES) {
    return {
      ok: false,
      message: `internal_metadata excede ${MAX_INTERNAL_METADATA_BYTES} bytes`,
    }
  }
  return { ok: true, mode: 'set', serialized }
}
