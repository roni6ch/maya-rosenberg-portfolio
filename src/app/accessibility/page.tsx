import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LegalDocument } from '@/components/sections/legal-document'
import { legalPages } from '@/data/legal.generated'

export const metadata: Metadata = { title: 'Accessibility | Maya Rosenberg Architect', description: 'הצהרת נגישות - Maya Rosenberg Architect' }

export default function AccessibilityPage() {
  const page = legalPages.find((entry) => entry.slug === 'accessibility')
  if (!page) notFound()
  return <LegalDocument page={page} />
}
