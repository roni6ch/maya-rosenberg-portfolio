import { ContactForm } from '@/components/ui/contact-form'
import { SOCIAL_LINKS } from '@/lib/site-links'
import type { SiteContent } from '@/types/portfolio'

interface ContactSectionProps {
  content: SiteContent
}

export function ContactSection({ content }: ContactSectionProps) {
  const { contact } = content
  return (
    <section id="contact" className="relative z-[2] border-t border-ink/10 bg-paper px-6 py-28 text-ink md:px-12 md:py-44">
      <div className="mx-auto grid max-w-[110rem] gap-20 md:grid-cols-12">
        <div className="md:col-span-7">
          <p className="text-[10px] font-light uppercase tracking-[0.5em] text-mist">Contact me</p>
          <a
            href={`mailto:${contact.email}`}
            className="mt-8 block break-all text-[clamp(1.4rem,3.6vw,3.4rem)] font-extralight tracking-[0.04em] transition-opacity hover:opacity-60"
          >
            {contact.email}
          </a>
          <div className="mt-14 grid gap-8 text-sm font-light tracking-[0.15em] sm:grid-cols-2">
            <p>{contact.address}</p>
            <a href={`tel:${contact.phone.replace(/-/g, '')}`} className="transition-opacity hover:opacity-60">
              {contact.phone}
            </a>
          </div>
          <ul className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-light uppercase tracking-[0.3em]">
            {SOCIAL_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="border-b border-ink/30 pb-1 transition-opacity hover:opacity-50">
                  {link.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-5">
          <p className="mb-10 text-[10px] font-light uppercase tracking-[0.5em] text-mist">Fill in the details and I will get back to you</p>
          <ContactForm email={contact.email} />
        </div>
      </div>
    </section>
  )
}
