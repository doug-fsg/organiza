'use client'

import { SystemSidebar } from "@/components/system/system-sidebar"

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col md:flex-row h-full min-h-0 bg-background/50 rounded-xl border shadow-sm overflow-hidden">
      <SystemSidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
