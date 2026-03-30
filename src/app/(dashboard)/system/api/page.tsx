'use client'

import { IntegracoesSection } from "@/components/integracoes/integracoes-section"

export default function APIKeysPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Chaves de API</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas chaves de acesso para integração via API externa</p>
      </div>

      <div className="rounded-xl border bg-card/30 dark:bg-card/10 backdrop-blur-md p-6">
        <IntegracoesSection />
      </div>
    </div>
  )
}
