import { SOCIAL_LINKS } from '@/lib/site-links'
import { siteContent } from '@/data/site-content.generated'

export const SITE_URL = 'https://roni6ch.github.io/maya-rosenberg-portfolio'
export const SITE_NAME = 'Maya Rosenberg Architect'
export const SITE_NAME_HE = 'מאיה רוזנברג אדריכלית'
export const SITE_DESCRIPTION =
  'Boutique architecture studio for residential design: apartments, houses and villas. Selected projects by Maya Rosenberg, Magshimim / Tel Aviv.'
export const OG_IMAGE = {
  url: siteContent.aboutImage?.originalUrl ?? `${SITE_URL}/icon.svg`,
  width: siteContent.aboutImage?.width ?? 1214,
  height: siteContent.aboutImage?.height ?? 900,
  alt: 'Maya Rosenberg, architect'
}

export function buildJsonLd() {
  const { name, contact, aboutImage, siteUrl, tagline, aboutParagraphs } = siteContent
  const personId = `${SITE_URL}/#person`
  const studioId = `${SITE_URL}/#studio`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Person', 'Architect'],
        '@id': personId,
        name,
        alternateName: 'מאיה רוזנברג',
        jobTitle: tagline,
        url: SITE_URL,
        image: aboutImage?.originalUrl,
        email: `mailto:${contact.email}`,
        telephone: contact.phone,
        address: {
          '@type': 'PostalAddress',
          streetAddress: contact.address,
          addressLocality: 'Magshimim',
          addressCountry: 'IL'
        },
        sameAs: SOCIAL_LINKS.map((link) => link.href),
        description: aboutParagraphs[0]
      },
      {
        '@type': 'ProfessionalService',
        '@id': studioId,
        name: `${name} Architect`,
        alternateName: SITE_NAME_HE,
        url: SITE_URL,
        image: aboutImage?.originalUrl,
        founder: { '@id': personId },
        email: `mailto:${contact.email}`,
        telephone: contact.phone,
        address: {
          '@type': 'PostalAddress',
          streetAddress: contact.address,
          addressLocality: 'Magshimim',
          addressCountry: 'IL'
        },
        areaServed: { '@type': 'Country', name: 'Israel' },
        serviceType: ['Residential architecture', 'Interior architecture', 'Villa design', 'Apartment design'],
        description: SITE_DESCRIPTION,
        sameAs: [siteUrl, ...SOCIAL_LINKS.map((link) => link.href)]
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: SITE_NAME_HE,
        inLanguage: ['en', 'he'],
        description: SITE_DESCRIPTION,
        publisher: { '@id': studioId }
      }
    ]
  }
}
