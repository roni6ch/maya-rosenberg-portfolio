'use client'

import dynamic from 'next/dynamic'
import { SnakeTrail } from '@/components/ui/snake-overlay'
import type { Project, SiteContent } from '@/types/portfolio'

const ProjectIndex = dynamic(() => import('./project-index').then((module) => ({ default: module.ProjectIndex })), {
  loading: () => <SectionPlaceholder label="Selected Projects" />
})

const AboutSection = dynamic(() => import('./about-section').then((module) => ({ default: module.AboutSection })), {
  loading: () => <SectionPlaceholder label="About" />
})

const RecommendationsSection = dynamic(() => import('./recommendations-section').then((module) => ({ default: module.RecommendationsSection })), {
  loading: () => <SectionPlaceholder label="Recommendations" />
})

const PressSection = dynamic(() => import('./press-section').then((module) => ({ default: module.PressSection })), {
  loading: () => <SectionPlaceholder label="Press" />
})

const ContactSection = dynamic(() => import('./contact-section').then((module) => ({ default: module.ContactSection })), {
  loading: () => <SectionPlaceholder label="Contact" />
})

const SiteFooter = dynamic(() => import('./site-footer').then((module) => ({ default: module.SiteFooter })))

interface BelowFoldProps {
  projects: Project[]
  content: SiteContent
}

/** Code-splits below-the-fold sections out of the critical home chunk. */
export function BelowFold({ projects, content }: BelowFoldProps) {
  return (
    <div id="below-fold" className="relative">
      <SnakeTrail target="#below-fold" />
      <ProjectIndex projects={projects} />
      <AboutSection content={content} />
      <RecommendationsSection content={content} />
      <PressSection content={content} />
      <ContactSection content={content} />
      <SiteFooter />
    </div>
  )
}

function SectionPlaceholder({ label }: { label: string }) {
  return (
    <section aria-hidden className="bg-paper px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[110rem]">
        <div className="h-8 w-48 animate-pulse bg-ink/5" />
        <p className="sr-only">{label}</p>
      </div>
    </section>
  )
}
