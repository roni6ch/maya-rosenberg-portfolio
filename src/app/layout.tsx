import type { Metadata, Viewport } from 'next'
import dynamic from 'next/dynamic'
import '@fontsource-variable/jost/wght.css'
import './globals.css'
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_NAME_HE, SITE_URL, buildJsonLd } from '@/lib/site-meta'

const AccessibilityToolbar = dynamic(
  () => import('@/components/ui/accessibility-toolbar').then((module) => ({ default: module.AccessibilityToolbar })),
  { ssr: false }
)

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ${SITE_NAME_HE}`,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'Maya Rosenberg',
    'מאיה רוזנברג',
    'architect',
    'אדריכלית',
    'residential architecture',
    'boutique studio',
    'Tel Aviv',
    'Magshimim',
    'villas',
    'apartments',
    'interior architecture'
  ],
  authors: [{ name: 'Maya Rosenberg', url: SITE_URL }],
  creator: 'Maya Rosenberg',
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  category: 'architecture',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    locale: 'en_IL',
    alternateLocale: ['he_IL'],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_NAME_HE}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE]
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | ${SITE_NAME_HE}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url]
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  formatDetection: { telephone: true, email: true, address: true }
}

export const viewport: Viewport = {
  themeColor: '#d4cfc4',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildJsonLd()

  return (
    <html lang="en">
      <body className="bg-paper font-sans font-light text-ink antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <AccessibilityToolbar />
      </body>
    </html>
  )
}
