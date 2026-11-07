export type MediaKind = 'photo' | 'plan'

export interface RemoteImage {
  /** Same-origin proxied URL of the file referenced by the site (stable identity key) */
  src: string
  /** Same-origin proxied URL of the highest-resolution file available (used for display and WebGL) */
  full: string
  /** Same-origin proxied ~1024px URL, used as an intermediate blur-up stage only */
  large: string
  /** Same-origin proxied ~300px URL, used for blur-up / thumbs */
  thumb: string
  /** Original absolute URL on mayarosenberg.co.il (attribution) */
  originalUrl: string
  width: number
  height: number
  alt: string
  kind: MediaKind
}

export interface Project {
  id: number
  slug: string
  index: number
  title: string
  location: string
  area: string
  photographer: string
  year: string
  note: string
  sourceUrl: string
  cover: RemoteImage
  images: RemoteImage[]
}

export interface SceneImage {
  url: string
  width: number
  height: number
}

/** Trimmed project data shipped to the WebGL scene (cover + 3 extra photos). */
export interface SceneProject {
  id: number
  images: SceneImage[]
}

/** Trimmed project data for the scroll overlay. */
export interface OverlayProject {
  id: number
  title: string
  location: string
  area: string
  photographer: string
  year: string
  note: string
}

export interface Recommendation {
  text: string
}

export interface PressItem {
  image: RemoteImage
  /** External article / post URL */
  href: string
  /** Human readable outlet name (e.g. "Mako") */
  outlet: string
}

export interface LegalBlock {
  kind: 'heading' | 'subheading' | 'paragraph' | 'bullet'
  text: string
}

/** Legal page text copied from the original site (Hebrew, right-to-left). */
export interface LegalPage {
  slug: 'privacy' | 'accessibility'
  title: string
  subtitle: string
  sourceUrl: string
  blocks: LegalBlock[]
}

export interface SiteContent {
  name: string
  tagline: string
  siteUrl: string
  aboutHeading: string
  aboutParagraphs: string[]
  aboutImage: RemoteImage | null
  recommendationsHeading: string
  recommendations: Recommendation[]
  pressItems: PressItem[]
  contact: {
    address: string
    phone: string
    email: string
  }
}
