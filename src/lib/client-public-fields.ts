import type { Prisma } from '@prisma/client'

/** Campos de Client seguros para UI / tRPC — exclui internalMetadata. */
export const clientPublicSelect = {
  id: true,
  accountId: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  customValues: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClientSelect

export type ClientPublic = Prisma.ClientGetPayload<{ select: typeof clientPublicSelect }>
