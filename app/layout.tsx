import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { ScaleConnectionProvider } from "@/contexts/scale-connection-context"
import { ThemeProvider } from "next-themes"
import { AppHeader } from "@/components/app-header"
import "./globals.css"
import { Manrope } from "next/font/google"

const manrope = Manrope({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${manrope.variable} antialiased`}>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ScaleConnectionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AppHeader />
            <main className="min-h-screen">{children}</main>
          </ThemeProvider>
        </ScaleConnectionProvider>
      </body>
    </html>
  )
}
