import { RemoteImg } from '@/components/ui/remote-img'
import { RevealGroup } from '@/components/ui/reveal-group'
import type { SiteContent } from '@/types/portfolio'

interface AboutSectionProps {
  content: SiteContent
}

export function AboutSection({ content }: AboutSectionProps) {
  const { aboutImage, aboutHeading, aboutParagraphs } = content
  return (
    <section id="about" className="bg-paper px-6 py-28 md:px-12 md:py-44">
      <RevealGroup className="mx-auto grid max-w-[110rem] gap-16 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-5">
          <h2 data-reveal="soft" className="text-[clamp(1.6rem,4vw,3.2rem)] font-extralight uppercase tracking-[0.2em]">
            {aboutHeading}
          </h2>
          {aboutImage && (
            <div data-reveal className="mt-12">
              <RemoteImg
                reveal
                src={aboutImage.full}
                thumb={aboutImage.large}
                alt="Maya Rosenberg"
                width={aboutImage.width}
                height={aboutImage.height}
              />
            </div>
          )}
        </div>
        <div dir="rtl" lang="he" className="font-hebrew space-y-6 text-[1.05rem] font-light leading-[2] text-ink/85 md:col-span-6 md:col-start-7">
          {aboutParagraphs.map((paragraph, index) => (
            <p key={paragraph} data-reveal="soft" className={index === 0 ? 'text-2xl font-extralight tracking-wide text-ink' : ''}>
              {paragraph}
            </p>
          ))}
        </div>
      </RevealGroup>
    </section>
  )
}
