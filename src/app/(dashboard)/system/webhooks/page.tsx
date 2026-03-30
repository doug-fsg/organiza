'use client'

import { WebhooksSection } from "@/components/integracoes/webhooks-section"

export default function WebhooksPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-sm text-muted-foreground">Configure URLs para receber notificações de eventos em tempo real</p>
      </div>
      
      <div className="rounded-xl border bg-card/30 dark:bg-card/10 backdrop-blur-md p-6">
        <WebhooksSection />
      </div>
    </div>
  )
}
