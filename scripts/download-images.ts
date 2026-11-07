/**
 * Downloads every image referenced by the generated data into public/remote/** so the site can be hosted as static
 * files (the original image host sends no CORS headers, which WebGL textures require). Run with: npm run images
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { projects } from '../src/data/projects.generated'
import { siteContent } from '../src/data/site-content.generated'
import type { RemoteImage } from '../src/types/portfolio'

const UPLOADS_ORIGIN = 'https://www.mayarosenberg.co.il/wp-content/uploads'
const PUBLIC_DIR = resolve(__dirname, '../public')
const CONCURRENCY = 8

function collectImages(): RemoteImage[] {
  const images = projects.flatMap((project) => [project.cover, ...project.images])
  const extras = [siteContent.aboutImage, ...siteContent.pressItems.map((item) => item.image)]
  return [...images, ...extras].filter((image): image is RemoteImage => Boolean(image))
}

async function download({ proxyPath }: { proxyPath: string }) {
  const relative = decodeURIComponent(proxyPath.slice('/remote/'.length))
  const target = resolve(PUBLIC_DIR, 'remote', relative)
  if (existsSync(target)) return 'cached'
  const response = await fetch(`${UPLOADS_ORIGIN}/${relative.split('/').map(encodeURIComponent).join('/')}`)
  if (!response.ok) throw new Error(`${response.status} ${proxyPath}`)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, Buffer.from(await response.arrayBuffer()))
  return 'downloaded'
}

async function main() {
  const paths = [...new Set(collectImages().flatMap((image) => [image.src, image.full, image.large, image.thumb]))]
  const counts = { cached: 0, downloaded: 0 }
  const queue = [...paths]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) counts[await download({ proxyPath: next })]++
    })
  )
  console.log(`images: ${paths.length} total, ${counts.downloaded} downloaded, ${counts.cached} cached`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
