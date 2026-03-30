import { NextResponse } from 'next/server'

/**
 * Formato de resposta da API.
 * { payload: T, meta?: { count, ... } }
 */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json(
    meta ? { payload: data, meta } : { payload: data },
    { status: 200 }
  )
}

export function apiError(
  message: string,
  status: number = 400,
  code?: string
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(code && { code }),
    },
    { status }
  )
}

export function apiUnauthorized(message = 'Token de acesso inválido ou ausente') {
  return apiError(message, 401, 'UNAUTHORIZED')
}

export function apiForbidden(message = 'Acesso negado a este recurso') {
  return apiError(message, 403, 'FORBIDDEN')
}

export function apiNotFound(message = 'Recurso não encontrado') {
  return apiError(message, 404, 'NOT_FOUND')
}
