'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { UserRole } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { DashboardContent } from '@/components/dashboard-content'

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams<{ tab?: string[] }>()
  const { data: session } = useSession()

  const segment = params.tab?.[0] ?? ''

  const activeAccount = session?.user?.accounts?.find(
    (acc) => acc.accountId === session.user.activeAccountId
  )
  const userRole = activeAccount?.role || 'MEMBER'
  const isSupplier = userRole === UserRole.SUPPLIER

  useEffect(() => {
    if (!segment) {
      const defaultRoute = isSupplier ? '/supplier' : '/kanban'
      router.replace(defaultRoute)
    }
  }, [segment, isSupplier, router])

  return <DashboardContent activeTab={segment} />
}
