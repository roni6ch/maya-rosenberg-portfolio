'use client'

import { useEffect, useState } from 'react'
import { LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, TextureLoader } from 'three'
import type { Texture } from 'three'
import { useThree } from '@react-three/fiber'
import { withBasePath } from '@/lib/remote-image'

export type TextureStatus = 'idle' | 'loading' | 'ready' | 'error'

interface UseRemoteTextureParams {
  url: string
  enabled: boolean
}

interface UseRemoteTextureResult {
  texture: Texture | null
  status: TextureStatus
  aspect: number
}

const loader = new TextureLoader()
loader.setCrossOrigin('anonymous')

/** Loads a same-origin proxied image as a texture only while `enabled`, and frees GPU memory when disabled. */
export function useRemoteTexture({ url, enabled }: UseRemoteTextureParams): UseRemoteTextureResult {
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy())
  const [result, setResult] = useState<UseRemoteTextureResult>({ texture: null, status: 'idle', aspect: 1.5 })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let loaded: Texture | null = null
    setResult((previous) => ({ ...previous, status: 'loading' }))

    loader.load(
      withBasePath({ path: url }),
      (texture) => {
        if (cancelled) return texture.dispose()
        texture.colorSpace = SRGBColorSpace
        texture.anisotropy = Math.min(8, maxAnisotropy)
        texture.generateMipmaps = true
        texture.minFilter = LinearMipmapLinearFilter
        texture.magFilter = LinearFilter
        loaded = texture
        const image = texture.image as { width: number; height: number }
        setResult({ texture, status: 'ready', aspect: image.width / image.height })
      },
      undefined,
      () => {
        if (!cancelled) setResult({ texture: null, status: 'error', aspect: 1.5 })
      }
    )

    return () => {
      cancelled = true
      loaded?.dispose()
      setResult((previous) => (previous.status === 'error' ? previous : { texture: null, status: 'idle', aspect: previous.aspect }))
    }
  }, [url, enabled, maxAnisotropy])

  return result
}
