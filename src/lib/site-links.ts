export interface SiteLink {
  label: string
  href: string
}

export const SOCIAL_LINKS: SiteLink[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/maya.rosenberg.architect/' },
  { label: 'Facebook', href: 'https://www.facebook.com/Maya.Rosenberg.Architect/' },
  { label: 'Pinterest', href: 'https://www.pinterest.com/mayagr81/' }
]

export const SECTION_LINKS: SiteLink[] = [
  { label: 'Projects', href: '/#projects' },
  { label: 'About', href: '/#about' },
  { label: 'Recommendations', href: '/#recommendations' },
  { label: 'Press', href: '/#press' },
  { label: 'Contact', href: '/#contact' }
]

export const LEGAL_LINKS: SiteLink[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Accessibility', href: '/accessibility' }
]
