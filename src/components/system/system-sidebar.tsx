'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Rocket, 
  Settings, 
  Globe, 
  ShieldCheck,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const systemNavItems = [
  {
    title: "Automações",
    href: "/system",
    icon: Rocket,
    description: "Botões inteligentes e fluxos"
  },
  {
    title: "Webhooks",
    href: "/system/webhooks",
    icon: Globe,
    description: "Configurações de Webhooks"
  },
  {
    title: "Chaves de API",
    href: "/system/api",
    icon: Settings,
    description: "Gerenciamento de API Keys"
  },
  {
    title: "Segurança",
    href: "/system/security",
    icon: ShieldCheck,
    description: "Permissões e acessos",
    disabled: true
  },
]

export function SystemSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="floating" collapsible="none" className="hidden md:flex w-64 border-r bg-card/50">
      <SidebarHeader className="h-16 flex items-center px-6 border-b">
        <h2 className="text-lg font-semibold tracking-tight">Sistema</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    disabled={item.disabled}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                      pathname === item.href 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "hover:bg-accent text-muted-foreground hover:text-foreground",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {item.disabled ? (
                      <div className="flex items-center gap-3 w-full">
                        <item.icon className="size-4 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm">{item.title}</span>
                          <span className="text-[10px] opacity-70">Em breve</span>
                        </div>
                      </div>
                    ) : (
                      <Link href={item.href} className="flex items-center gap-3 w-full">
                        <item.icon className={cn(
                          "size-4 shrink-0 transition-transform group-hover:scale-110",
                          pathname === item.href ? "text-primary" : ""
                        )} />
                        <div className="flex flex-col">
                          <span className="text-sm">{item.title}</span>
                        </div>
                        {pathname === item.href && (
                          <ChevronRight className="ml-auto size-3" />
                        )}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
