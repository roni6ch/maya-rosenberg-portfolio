import Link from 'next/link'
import { SiteFooter } from '@/components/sections/site-footer'
import type { LegalBlock, LegalPage } from '@/types/portfolio'

interface LegalDocumentProps {
  page: LegalPage
}

export function LegalDocument({ page }: LegalDocumentProps) {
  return (
    <>
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="text-[11px] font-light uppercase tracking-[0.4em]">
          Maya Rosenberg
        </Link>
        <Link href="/" className="text-[11px] font-light uppercase tracking-[0.3em] text-ink/60 transition-opacity hover:opacity-60">
          &larr; Back to site
        </Link>
      </header>
      <main id="main-content" tabIndex={-1} className="bg-paper px-6 pb-32 pt-20 md:px-12 md:pt-32">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-[clamp(1.8rem,4.5vw,3.4rem)] font-extralight uppercase tracking-[0.2em]">{page.title}</h1>
          <p lang="he" className="font-hebrew mt-4 text-xl font-extralight text-ink/60">
            {page.subtitle}
          </p>
          <div dir="rtl" lang="he" className="font-hebrew mt-16 text-[1.05rem] font-light leading-[2] text-ink/85">
            {page.blocks.map((block, index) => (
              <LegalBlockView key={`${index}-${block.text.slice(0, 24)}`} block={block} />
            ))}
          </div>
          <p className="mt-20 text-[11px] font-light tracking-[0.15em] text-mist">
            Source:{' '}
            <a href={page.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              mayarosenberg.co.il
            </a>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  )
}

function renderWithLinks({ text }: { text: string }) {
  const match = text.match(/([\w.-]+@[\w.-]+\.\w+)/)
  if (!match || match.index === undefined) return text
  const before = text.slice(0, match.index)
  const after = text.slice(match.index + match[0].length)
  return (
    <>
      {before}
      <a href={`mailto:${match[0]}`} dir="ltr" className="underline underline-offset-4">
        {match[0]}
      </a>
      {after}
    </>
  )
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.kind === 'heading') return <h2 className="mb-3 mt-12 text-2xl font-light text-ink">{block.text}</h2>
  if (block.kind === 'subheading') return <h3 className="mb-2 mt-8 text-lg font-normal text-ink">{block.text}</h3>
  if (block.kind === 'bullet')
    return (
      <p className="relative pr-6">
        <span aria-hidden className="absolute right-0 top-[1.05em] h-1 w-1 rounded-full bg-ink/50" />
        {renderWithLinks({ text: block.text })}
      </p>
    )
  return <p className="mb-4">{renderWithLinks({ text: block.text })}</p>
}
