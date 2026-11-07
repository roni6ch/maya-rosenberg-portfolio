'use client'

import Image from 'next/image'
import { useState } from 'react'

interface RemoteImgProps {
  src: string
  /** low-res placeholder shown while the main image loads */
  thumb?: string
  alt: string
  width: number
  height: number
  className?: string
  imgClassName?: string
  /** only for the true LCP / above-fold hero image */
  priority?: boolean
  /** @deprecated use priority — kept for call-site compatibility */
  eager?: boolean
  /** opt into the scroll-reveal clip wipe + parallax (see use-scroll-reveal) */
  reveal?: boolean
  /** opt into the bottom-to-top work-list choreography (see use-work-rise) */
  rise?: boolean
  /** responsive hint for the browser (static export keeps unoptimized URLs) */
  sizes?: string
}

const DEFAULT_SIZES = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 40vw'

/** Lazy remote image via next/image with skeleton, LQIP, and layout-shift-safe aspect ratio. */
export function RemoteImg({
  src,
  thumb,
  alt,
  width,
  height,
  className = '',
  imgClassName = '',
  priority = false,
  eager = false,
  reveal = false,
  rise = false,
  sizes = DEFAULT_SIZES
}: RemoteImgProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const isPriority = priority || eager

  return (
    <div
      {...(reveal ? { 'data-reveal-media': '' } : {})}
      {...(rise ? { 'data-rise-media': '' } : {})}
      className={`relative overflow-hidden bg-[#e4e2dc] ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {thumb && status === 'loading' && (
        <Image
          src={thumb}
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          unoptimized
          priority={false}
          className="object-cover blur-md scale-105"
        />
      )}
      {status === 'loading' && <div className="absolute inset-0 animate-pulse bg-[#d9d7d1]/40" />}
      {status === 'error' ? (
        <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-wider2 text-mist">Image unavailable</div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          priority={isPriority}
          loading={isPriority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          className={`object-cover transition-opacity duration-700 ${status === 'ready' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
    </div>
  )
}
