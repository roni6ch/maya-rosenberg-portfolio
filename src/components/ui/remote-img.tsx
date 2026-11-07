'use client'

import { useEffect, useRef, useState } from 'react'
import { withBasePath } from '@/lib/remote-image'

interface RemoteImgProps {
  src: string
  /** low-res placeholder shown while the main image loads */
  thumb?: string
  alt: string
  width: number
  height: number
  className?: string
  imgClassName?: string
  eager?: boolean
  /** opt into the scroll-reveal clip wipe + parallax (see use-scroll-reveal) */
  reveal?: boolean
  /** opt into the bottom-to-top work-list choreography (see use-work-rise) */
  rise?: boolean
}

/** Lazy remote image with a skeleton while loading and a quiet fallback if the host fails. */
export function RemoteImg({ src, thumb, alt, width, height, className = '', imgClassName = '', eager = false, reveal = false, rise = false }: RemoteImgProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const image = imgRef.current
    if (!image?.complete) return
    setStatus(image.naturalWidth > 0 ? 'ready' : 'error')
  }, [src])

  return (
    <div
      {...(reveal ? { 'data-reveal-media': '' } : {})}
      {...(rise ? { 'data-rise-media': '' } : {})}
      className={`relative overflow-hidden bg-[#e4e2dc] ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {thumb && status === 'loading' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={withBasePath({ path: thumb })} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-105 object-cover blur-md" />
      )}
      {status === 'loading' && <div className="absolute inset-0 animate-pulse bg-[#d9d7d1]/40" />}
      {status === 'error' ? (
        <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-wider2 text-mist">Image unavailable</div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={withBasePath({ path: src })}
          alt={alt}
          width={width}
          height={height}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${status === 'ready' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
    </div>
  )
}
