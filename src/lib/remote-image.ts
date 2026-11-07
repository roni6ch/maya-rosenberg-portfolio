const UPLOADS_PREFIX = 'https://www.mayarosenberg.co.il/wp-content/uploads/'
const PROXY_PREFIX = '/remote/'

interface ToProxyUrlParams {
  url: string
}

/** Turn an absolute uploads URL into the same-origin proxied path (CORS-safe for WebGL). */
export function toProxyUrl({ url }: ToProxyUrlParams): string {
  if (!url.startsWith(UPLOADS_PREFIX)) return url
  const relative = decodeURI(url.slice(UPLOADS_PREFIX.length))
  return PROXY_PREFIX + relative.split('/').map(encodeURIComponent).join('/')
}

interface ImageSizeParams {
  url: string
}

/** Strip WordPress "-300x200" size suffix to get the original file URL. */
export function toOriginalUrl({ url }: ImageSizeParams): string {
  return url.replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)$/i, '$1')
}

/** Prefix a root-relative asset path with the deployment base path (set when hosted under a sub-path, e.g. GitHub Pages). */
export function withBasePath({ path }: { path: string }): string {
  if (!path.startsWith('/')) return path
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? '/maya-rosenberg-portfolio'}${path}`
}
