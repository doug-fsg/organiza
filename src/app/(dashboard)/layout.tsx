'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { LoadingSpinner } from '@/components/loading-spinner'

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="!py-0" text="Carregando..." />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const activeAccount = session.user.accounts.find(
    (acc) => acc.accountId === session.user.activeAccountId
  )

  const user = {
    id: session.user.id,
    name: session.user.name,
    role: activeAccount?.role || 'MEMBER',
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' })
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      pathname={pathname}
    >
      {children}
    </DashboardLayout>
  )
}
