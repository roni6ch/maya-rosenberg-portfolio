import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LegalDocument } from '@/components/sections/legal-document'
import { legalPages } from '@/data/legal.generated'

export const metadata: Metadata = { title: 'Privacy Policy | Maya Rosenberg Architect', description: 'מדיניות פרטיות - Maya Rosenberg Architect' }

export default function PrivacyPage() {
  const page = legalPages.find((entry) => entry.slug === 'privacy')
  if (!page) notFound()
  return <LegalDocument page={page} />
}
