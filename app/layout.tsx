import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { ScaleConnectionProvider } from "@/contexts/scale-connection-context"
import { FarmProvider } from "@/contexts/farm-context"
import { ThemeProvider } from "next-themes"
import { AppHeader } from "@/components/app-header"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agro DPE - Gestao de Gado",
  description: "Sistema de gestao de gado com integracao XR5000",
  generator: "v0.app",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ScaleConnectionProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <FarmProvider>
              <AppHeader />
              <main className="min-h-screen">{children}</main>
            </FarmProvider>
          </ThemeProvider>
        </ScaleConnectionProvider>
      </body>
    </html>
  )
}
