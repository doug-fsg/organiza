import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/providers/trpc-provider";
import { SessionProvider } from "@/providers/session-provider";
import { Toaster } from 'react-hot-toast';

// Inicializar serviços do servidor (cron scheduler)
import '@/lib/server-init';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Organiza - Tenha Clareza Sobre Sua Equipe",
  description: "Delegue tarefas com confiança e acompanhe tudo em tempo real. Saiba exatamente quem está fazendo o quê na sua empresa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <TRPCProvider>
            {children}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
