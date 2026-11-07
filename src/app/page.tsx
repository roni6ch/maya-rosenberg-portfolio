import { ExperienceShell } from '@/components/experience-shell'
import { BelowFold } from '@/components/sections/below-fold'
import { projects } from '@/data/projects.generated'
import { siteContent } from '@/data/site-content.generated'

export default function HomePage() {
  return (
    <ExperienceShell projects={projects} tagline={siteContent.tagline}>
      <BelowFold projects={projects} content={siteContent} />
    </ExperienceShell>
  )
}
