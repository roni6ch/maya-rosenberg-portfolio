/**
 * Pulls real content from https://www.mayarosenberg.co.il via its open WordPress REST API
 * and writes typed data to src/data/*.generated.ts. Run with: npm run scrape
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { toOriginalUrl, toProxyUrl } from '../src/lib/remote-image'
import type { LegalBlock, LegalPage, PressItem, Project, RemoteImage, SiteContent } from '../src/types/portfolio'

const SITE = 'https://www.mayarosenberg.co.il'
const API = `${SITE}/wp-json/wp/v2`
const OUT_DIR = resolve(__dirname, '../src/data')

const PROJECT_PAGE_IDS = [74, 318, 360, 379, 402, 420, 432, 794, 995]
const PAGE_IDS = { projects: 23, about: 38, press: 56, recommendations: 65 }
const EXCLUDED_FILE = /(^|\/)(empty|logo|cropped-logo|about-pic|press-)/i
const PLAN_FILE = /(pl_|plan|A4)/i
const UPLOAD_URL = /https?:\\?\/\\?\/www\.mayarosenberg\.co\.il\\?\/wp-content\\?\/uploads\\?\/[^"'\s)<>\\]+(?:\\?\/[^"'\s)<>\\]+)*\.(?:jpe?g|png|webp)/gi

interface WpMedia {
  id: number
  source_url: string
  alt_text: string
  media_details?: {
    width?: number
    height?: number
    /** file name of the un-scaled upload when WordPress generated a "-scaled" copy */
    original_image?: string
    sizes?: Record<string, { source_url: string }>
  }
}

interface WpPage {
  id: number
  slug: string
  link: string
  content: { rendered: string }
}

interface ProjectMeta {
  title: string
  location: string
  area: string
  photographer: string
  year: string
  note: string
}

const mediaByUrl = new Map<string, WpMedia>()

async function getJson<T>({ url }: { url: string }): Promise<T> {
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 portfolio-scraper' } })
  if (!response.ok) throw new Error(`Request failed ${response.status}: ${url}`)
  return response.json() as Promise<T>
}

async function loadMediaLibrary() {
  for (let page = 1; page < 20; page++) {
    const url = `${API}/media?per_page=100&page=${page}&_fields=id,source_url,alt_text,media_details`
    const response = await fetch(url)
    if (!response.ok) break
    const items = (await response.json()) as WpMedia[]
    for (const item of items) mediaByUrl.set(item.source_url, item)
    if (items.length < 100) break
  }
  console.log(`media library: ${mediaByUrl.size} items`)
}

function getPage({ id }: { id: number }) {
  return getJson<WpPage>({ url: `${API}/pages/${id}?_fields=id,slug,link,content` })
}

function decodeEntities({ text }: { text: string }) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function htmlToLines({ html }: { html: string }) {
  const withBreaks = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<br\s*\/?>|<\/p>|<\/h\d>|<\/div>/gi, '\n')
  return decodeEntities({ text: withBreaks.replace(/<[^>]+>/g, '') })
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function extractTextWidgets({ html }: { html: string }) {
  const widgets: string[][] = []
  const pattern = /elementor-widget-text-editor[^>]*>\s*<div class="elementor-widget-container">([\s\S]*?)<\/div>\s*<\/div>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html))) widgets.push(htmlToLines({ html: match[1] }))
  return widgets
}

function extractHeadings({ html }: { html: string }) {
  const headings: string[] = []
  const pattern = /<h[1-6][^>]*elementor-heading-title[^>]*>([\s\S]*?)<\/h[1-6]>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html))) headings.push(...htmlToLines({ html: match[1] }))
  return headings
}

function extractUploadUrls({ html }: { html: string }) {
  const urls = (html.match(UPLOAD_URL) ?? []).map((url) => url.replace(/\\\//g, '/'))
  const originals = urls.map((url) => toOriginalUrl({ url }))
  return [...new Set(originals)]
}

interface ImageSize {
  width: number
  height: number
}

const sizeCache = new Map<string, ImageSize | null>()

/** Reads pixel dimensions from the first bytes of a JPEG/PNG (used when the media library has no entry). */
function parseImageSize({ bytes }: { bytes: Uint8Array }): ImageSize | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length > 24 && view.getUint32(0) === 0x89504e47) return { width: view.getUint32(16), height: view.getUint32(20) }
  if (view.getUint16(0) !== 0xffd8) return null
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = bytes[offset + 1]
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrame) return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) }
    offset += 2 + view.getUint16(offset + 2)
  }
  return null
}

async function readImageSize({ url }: { url: string }): Promise<ImageSize | null> {
  if (sizeCache.has(url)) return sizeCache.get(url) ?? null
  let size: ImageSize | null = null
  try {
    const response = await fetch(url, { headers: { range: 'bytes=0-131071', 'user-agent': 'Mozilla/5.0 portfolio-scraper' } })
    if (response.ok) size = parseImageSize({ bytes: new Uint8Array(await response.arrayBuffer()) })
  } catch {
    size = null
  }
  sizeCache.set(url, size)
  return size
}

/** Highest-resolution file for a media item: the un-scaled upload if WordPress made a "-scaled" copy, else the original. */
function resolveFullUrl({ originalUrl, media }: { originalUrl: string; media?: WpMedia }) {
  const unscaled = media?.media_details?.original_image
  if (!unscaled) return originalUrl
  return originalUrl.slice(0, originalUrl.lastIndexOf('/') + 1) + unscaled
}

async function buildImage({ originalUrl }: { originalUrl: string }): Promise<RemoteImage> {
  const media = mediaByUrl.get(originalUrl)
  const sizes = media?.media_details?.sizes
  const largeUrl = sizes?.large?.source_url ?? sizes?.medium_large?.source_url ?? originalUrl
  const thumbUrl = sizes?.medium?.source_url ?? sizes?.thumbnail?.source_url ?? largeUrl
  const fullUrl = resolveFullUrl({ originalUrl, media })
  const knownWidth = media?.media_details?.width
  const knownHeight = media?.media_details?.height
  const measured = knownWidth && knownHeight ? null : await readImageSize({ url: originalUrl })
  if (!knownWidth && !measured) console.warn(`no dimensions for ${originalUrl}, using 1500x1000`)
  return {
    src: toProxyUrl({ url: originalUrl }),
    full: toProxyUrl({ url: fullUrl }),
    large: toProxyUrl({ url: largeUrl }),
    thumb: toProxyUrl({ url: thumbUrl }),
    originalUrl,
    width: knownWidth ?? measured?.width ?? 1500,
    height: knownHeight ?? measured?.height ?? 1000,
    alt: media?.alt_text ?? '',
    kind: PLAN_FILE.test(originalUrl.split('/').pop() ?? '') ? 'plan' : 'photo'
  }
}

function pixelCount({ image }: { image: RemoteImage }) {
  return image.width * image.height
}

/** Keeps the project's chosen cover unless it is low-res; otherwise the sharpest landscape photo wins. */
function pickCover({ cover, photos }: { cover: RemoteImage | undefined; photos: RemoteImage[] }): RemoteImage {
  const landscape = photos.filter((image) => image.width >= image.height)
  const pool = landscape.length ? landscape : photos
  const best = pool.reduce<RemoteImage | undefined>((top, image) => (!top || pixelCount({ image }) > pixelCount({ image: top }) ? image : top), undefined)
  if (cover && (cover.width >= 1400 || !best)) return cover
  return best ?? cover ?? photos[0]
}

function parseProjectMeta({ html }: { html: string }): ProjectMeta {
  const headings = extractHeadings({ html })
  const widgets = extractTextWidgets({ html })
  const metaLines = widgets.find((lines) => lines.some((line) => /^Location\b/i.test(line))) ?? []
  const meta: ProjectMeta = { title: headings[0] ?? '', location: '', area: '', photographer: '', year: '', note: '' }
  const notes: string[] = []
  for (const line of metaLines) {
    if (/^Location\s*:/i.test(line)) meta.location = line.replace(/^Location\s*:/i, '').trim()
    else if (/^Area\s*:/i.test(line)) meta.area = line.replace(/^Area\s*:/i, '').trim()
    else if (/^Photograph(y)?\s*:/i.test(line)) meta.photographer = line.replace(/^Photograph(y)?\s*:/i, '').trim()
    else if (/^\d{4}$/.test(line)) meta.year = line
    else if (line !== meta.title) notes.push(line)
  }
  if (!meta.title) meta.title = notes.shift() ?? ''
  meta.note = notes.join(' · ')
  return meta
}

function getCoverOrder({ html }: { html: string }) {
  const covers = new Map<string, string>()
  const slugOrder: string[] = []
  const pattern = /href="https?:\/\/www\.mayarosenberg\.co\.il\/(project-[^"\/]+)\/?"|uploads\/([^"'\s)]+\.(?:jpe?g|png))/g
  let currentSlug = ''
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html))) {
    if (match[1]) {
      currentSlug = match[1]
      if (!slugOrder.includes(currentSlug)) slugOrder.push(currentSlug)
    } else if (match[2] && currentSlug && !covers.has(currentSlug)) {
      covers.set(currentSlug, `${SITE}/wp-content/uploads/${match[2]}`)
    }
  }
  return { covers, slugOrder }
}

async function scrapeProjects() {
  const projectsPage = await getPage({ id: PAGE_IDS.projects })
  const { covers, slugOrder } = getCoverOrder({ html: projectsPage.content.rendered })
  const pages = await Promise.all(PROJECT_PAGE_IDS.map((id) => getPage({ id })))

  const projects: Project[] = await Promise.all(pages.map(async (page) => {
    const html = page.content.rendered
    const meta = parseProjectMeta({ html })
    const imageUrls = extractUploadUrls({ html }).filter((url) => !EXCLUDED_FILE.test(url.split('/uploads/')[1] ?? url))
    const images = await Promise.all(imageUrls.map((originalUrl) => buildImage({ originalUrl })))
    const photos = images.filter((image) => image.kind === 'photo')
    const coverUrl = covers.get(page.slug)
    const gridCover = coverUrl ? await buildImage({ originalUrl: toOriginalUrl({ url: coverUrl }) }) : undefined
    const cover = pickCover({ cover: gridCover, photos })
    return {
      id: page.id,
      slug: page.slug,
      index: 0,
      ...meta,
      sourceUrl: page.link,
      cover,
      images: images.length ? images : [cover]
    }
  }))

  const rank = (slug: string) => {
    const position = slugOrder.indexOf(slug)
    return position === -1 ? 999 : position
  }
  const sorted = [...projects].sort((a, b) => rank(a.slug) - rank(b.slug) || b.id - a.id)
  return sorted.map((project, index) => ({ ...project, index }))
}

/** Testimonials are one long text block; each ends with a short sign-off line ("אוהבים ...", "משפחת ..."). */
function splitRecommendations({ lines }: { lines: string[] }) {
  const results: { text: string }[] = []
  let buffer: string[] = []
  for (const line of lines) {
    buffer.push(line)
    const isSignOff = line.length < 40 && /^(אוהבים|משפחת|בברכה|תודה)/.test(line)
    if (!isSignOff) continue
    results.push({ text: buffer.join(' ') })
    buffer = []
  }
  if (buffer.join(' ').length > 80) results.push({ text: buffer.join(' ') })
  return results.filter((item) => item.text.length > 80)
}

const OUTLET_BY_HOST: [RegExp, string][] = [
  [/(^|\.)mako\.co\.il$/, 'Mako'],
  [/(^|\.)wallsmag\.co\.il$/, 'Walls Magazine'],
  [/(^|\.)facebook\.com$/, 'Facebook'],
  [/(^|\.)semel-kitchens\.co\.il$/, 'Semel Kitchens']
]

/** Decodes entities, repairs the source's corrupted percent-escapes ("NaN7%90" -> "%d7%90") and strips tracking params. */
function cleanPressHref({ raw }: { raw: string }) {
  const decoded = decodeEntities({ text: raw.replace(/\\\//g, '/') }).replace(/NaN7/g, '%d7')
  const url = new URL(decoded)
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|partner$)/i.test(key)) url.searchParams.delete(key)
  }
  return url.toString()
}

function getOutlet({ href }: { href: string }) {
  const host = new URL(href).hostname
  return OUTLET_BY_HOST.find(([pattern]) => pattern.test(host))?.[1] ?? host.replace(/^www\./, '')
}

async function checkHref({ href }: { href: string }) {
  try {
    const response = await fetch(href, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) portfolio-scraper' } })
    console.log(`press link ${response.status} ${href}`)
  } catch (error) {
    console.warn(`press link UNVERIFIED ${href} (${(error as Error).message})`)
  }
}

/**
 * Every press tile is an Elementor gallery widget whose settings carry the article URL. The page repeats each
 * widget for other breakpoints (and with "-1" image copies), so items are merged by href, keeping the sharpest image.
 */
async function scrapePressItems({ html }: { html: string }): Promise<PressItem[]> {
  const marker = 'elementor-widget-gallery'
  const starts: number[] = []
  for (let index = html.indexOf(marker); index !== -1; index = html.indexOf(marker, index + marker.length)) starts.push(index)

  const hrefs: string[] = []
  const candidates = new Map<string, string[]>()
  starts.forEach((start, position) => {
    const slice = html.slice(start, starts[position + 1] ?? html.length)
    const settings = slice.match(/data-settings="([^"]+)"/)?.[1]
    if (!settings) return
    let rawHref = ''
    try {
      rawHref = (JSON.parse(decodeEntities({ text: settings })) as { url?: { url?: string } }).url?.url ?? ''
    } catch {
      return
    }
    if (!rawHref) return
    const href = cleanPressHref({ raw: rawHref })
    const images = (slice.match(UPLOAD_URL) ?? []).map((url) => toOriginalUrl({ url: url.replace(/\\\//g, '/') })).filter((url) => /press-\d/i.test(url))
    if (!candidates.has(href)) hrefs.push(href)
    candidates.set(href, [...(candidates.get(href) ?? []), ...images])
  })

  const items: PressItem[] = []
  for (const href of hrefs) {
    const images = await Promise.all([...new Set(candidates.get(href))].map((originalUrl) => buildImage({ originalUrl })))
    const image = images.reduce<RemoteImage | undefined>((top, next) => (!top || pixelCount({ image: next }) > pixelCount({ image: top }) ? next : top), undefined)
    if (!image) continue
    items.push({ image, href, outlet: getOutlet({ href }) })
  }
  await Promise.all(items.map((item) => checkHref({ href: item.href })))
  return items
}

async function scrapeSiteContent(): Promise<SiteContent> {
  const [about, press, recommendations, contact] = await Promise.all([
    getPage({ id: PAGE_IDS.about }),
    getPage({ id: PAGE_IDS.press }),
    getPage({ id: PAGE_IDS.recommendations }),
    getPage({ id: 106 })
  ])

  const aboutWidgets = extractTextWidgets({ html: about.content.rendered })
  const aboutParagraphs = [...new Set(aboutWidgets.flat())].filter((line) => line !== 'נעים להכיר')
  const aboutImageUrl = about.content.rendered.match(/about-pic-[^"'\s)\\]+\.jpg/)?.[0]
  const aboutImage = aboutImageUrl
    ? await buildImage({ originalUrl: toOriginalUrl({ url: `${SITE}/wp-content/uploads/2020/07/${aboutImageUrl}` }) })
    : null

  const pressItems = await scrapePressItems({ html: press.content.rendered })

  const recommendationTexts = splitRecommendations({
    lines: [...new Set(extractTextWidgets({ html: recommendations.content.rendered }).flat())]
  })

  const contactText = htmlToLines({ html: contact.content.rendered }).join(' | ')
  const phone = contactText.match(/0\d{2}-\d{7}/)?.[0] ?? '050-3444787'
  const email = contactText.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] ?? 'office@mayarosenbergarch.com'
  const address = contactText.match(/7 Hadekel St[^|]*?(?=\s*\d{2,3}-)/)?.[0]?.trim() ?? '7 Hadekel St, Magshimim'

  return {
    name: 'Maya Rosenberg',
    tagline: 'Architect',
    siteUrl: SITE,
    aboutHeading: 'Who am I?',
    aboutParagraphs,
    aboutImage,
    recommendationsHeading: 'What do people say?',
    recommendations: recommendationTexts,
    pressItems,
    contact: { address, phone, email }
  }
}

const LEGAL_PAGES = [
  { id: 922, slug: 'privacy', title: 'Privacy Policy' },
  { id: 860, slug: 'accessibility', title: 'Accessibility' }
] as const

function classifyLegalLines({ lines }: { lines: string[] }) {
  const merged: string[] = []
  for (const line of lines) {
    const previous = merged[merged.length - 1]
    // Elementor splits some sentences with a <br>; re-join when the previous line ends mid-sentence.
    if (previous && /(\s|^)עם$/.test(previous)) merged[merged.length - 1] = `${previous} ${line}`
    else merged.push(line)
  }

  const blocks: LegalBlock[] = []
  let afterColon = false
  for (const line of merged) {
    if (line.startsWith('●')) {
      blocks.push({ kind: 'bullet', text: line.replace(/^●\s*/, '') })
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      afterColon = false
      blocks.push({ kind: 'heading', text: line })
      continue
    }
    const isShort = line.length < 48
    if (afterColon && isShort && !/:\s*$/.test(line)) {
      blocks.push({ kind: 'bullet', text: line })
      continue
    }
    const isSubheading = /\s?:\s*$/.test(line) && isShort
    afterColon = /\s?:\s*$/.test(line)
    blocks.push({ kind: isSubheading ? 'subheading' : 'paragraph', text: line.replace(/\s+:$/, ':') })
  }
  return blocks
}

async function scrapeLegalPages(): Promise<LegalPage[]> {
  const pages: LegalPage[] = []
  for (const { id, slug, title } of LEGAL_PAGES) {
    const page = await getPage({ id })
    const [firstHeading, secondHeading] = extractHeadings({ html: page.content.rendered })
    const lines = [...new Set(extractTextWidgets({ html: page.content.rendered }).flat())]
    const subtitle = slug === 'privacy' ? (secondHeading ?? '') : (firstHeading ?? '')
    pages.push({ slug, title, subtitle, sourceUrl: page.link, blocks: classifyLegalLines({ lines }) })
  }
  return pages
}

function writeGenerated({ file, name, type, value }: { file: string; name: string; type: string; value: unknown }) {
  const path = resolve(OUT_DIR, file)
  mkdirSync(dirname(path), { recursive: true })
  const typeName = type === 'Project' || type === 'LegalPage' ? `${type}[]` : type
  const body = `// AUTO-GENERATED by scripts/scrape-maya.ts from ${SITE} - do not edit by hand\nimport type { ${type} } from '@/types/portfolio'\n\nexport const ${name}: ${typeName} = ${JSON.stringify(value, null, 2)}\n`
  writeFileSync(path, body)
  console.log(`wrote ${path}`)
}

async function main() {
  if (process.argv.includes('--legal')) {
    writeGenerated({ file: 'legal.generated.ts', name: 'legalPages', type: 'LegalPage', value: await scrapeLegalPages() })
    return
  }
  await loadMediaLibrary()
  const [projects, content, legalPages] = await Promise.all([scrapeProjects(), scrapeSiteContent(), scrapeLegalPages()])
  writeGenerated({ file: 'legal.generated.ts', name: 'legalPages', type: 'LegalPage', value: legalPages })
  writeGenerated({ file: 'projects.generated.ts', name: 'projects', type: 'Project', value: projects })
  writeGenerated({ file: 'site-content.generated.ts', name: 'siteContent', type: 'SiteContent', value: content })
  for (const project of projects) {
    console.log(`${project.index} ${project.title} | ${project.location} | ${project.area} | ${project.photographer} | ${project.year} | ${project.note} | ${project.images.length} images`)
  }
  console.log(`about paragraphs: ${content.aboutParagraphs.length}, recs: ${content.recommendations.length}, press: ${content.pressItems.length} (${content.pressItems.map((item) => item.outlet).join(', ')})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
