import { HebrewFont } from '@/components/ui/hebrew-font'
import { RevealGroup } from '@/components/ui/reveal-group'
import type { SiteContent } from '@/types/portfolio'

interface RecommendationsSectionProps {
  content: SiteContent
}

export function RecommendationsSection({ content }: RecommendationsSectionProps) {
  const { recommendations, recommendationsHeading } = content
  if (!recommendations.length) return null
  return (
    <section id="recommendations" className="relative z-[2] border-t border-ink/10 bg-paper px-6 py-28 md:px-12 md:py-40">
      <HebrewFont />
      <div className="mx-auto max-w-[110rem]">
        <h2 className="mb-16 text-[clamp(1.6rem,4vw,3.2rem)] font-extralight uppercase tracking-[0.2em] md:mb-24">{recommendationsHeading}</h2>
        <RevealGroup dir="rtl" lang="he" className="font-hebrew gap-x-16 md:columns-2">
          {recommendations.map((recommendation) => (
            <blockquote data-reveal="soft" key={recommendation.text.slice(0, 40)} className="mb-14 break-inside-avoid text-[0.95rem] font-light leading-[1.95] text-ink/80">
              <span aria-hidden className="mb-3 block h-px w-8 bg-ink/40" />
              {recommendation.text}
            </blockquote>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
