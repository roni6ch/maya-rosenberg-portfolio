import type { Metadata, Viewport } from 'next'
import { AccessibilityToolbar } from '@/components/ui/accessibility-toolbar'
import '@fontsource-variable/heebo'
import '@fontsource-variable/jost'
import './globals.css'

export const metadata: Metadata = {
  title: 'Maya Rosenberg Architect | מאיה רוזנברג אדריכלית',
  description: 'Boutique architecture studio for residential design: apartments, houses and villas. Selected projects by Maya Rosenberg.'
}

export const viewport: Viewport = { themeColor: '#0a0b0e' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper font-sans font-light text-ink antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <AccessibilityToolbar />
      </body>
    </html>
  )
}
