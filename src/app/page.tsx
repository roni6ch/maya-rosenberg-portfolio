import { ExperienceShell } from '@/components/experience-shell'
import { AboutSection } from '@/components/sections/about-section'
import { ContactSection } from '@/components/sections/contact-section'
import { PressSection } from '@/components/sections/press-section'
import { ProjectIndex } from '@/components/sections/project-index'
import { RecommendationsSection } from '@/components/sections/recommendations-section'
import { SiteFooter } from '@/components/sections/site-footer'
import { projects } from '@/data/projects.generated'
import { siteContent } from '@/data/site-content.generated'

export default function HomePage() {
  return (
    <ExperienceShell projects={projects} tagline={siteContent.tagline}>
      <ProjectIndex projects={projects} />
      <AboutSection content={siteContent} />
      <RecommendationsSection content={siteContent} />
      <PressSection content={siteContent} />
      <ContactSection content={siteContent} />
      <SiteFooter />
    </ExperienceShell>
  )
}
