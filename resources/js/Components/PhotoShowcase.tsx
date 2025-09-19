import React, { useLayoutEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card'
import { gsap } from 'gsap'

type Props = {
  speed?: number // px/s
  framed?: boolean // tampil dengan Card (true) atau konten saja (false)
}

export default function PhotoShowcase({ speed = 60, framed = false }: Props) {
  const scope = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  const images = [
    { src: '/images/kode_1.webp', alt: 'Kode 1' },
    { src: '/images/kode_2.webp', alt: 'Kode 2' },
    { src: '/images/kode_3.webp', alt: 'Kode 3' },
    { src: '/images/kode_4.webp', alt: 'Kode 4' },
    { src: '/images/kode_5.webp', alt: 'Kode 5' },
    { src: '/images/kode_6.webp', alt: 'Kode 6' },
  ]

  const DungeonCSS = useMemo(() => (
    <style>{`
      @keyframes torchFlicker { 0%,100%{opacity:1;filter:brightness(1)} 25%{opacity:.86;filter:brightness(1.12)} 50%{opacity:.75;filter:brightness(.95)} 75%{opacity:.92;filter:brightness(1.05)} }
      .torch-flicker { animation: torchFlicker 2.2s ease-in-out infinite; }
    `}</style>
  ), [])

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const track = trackRef.current
      if (!track) return
      if (tweenRef.current) { tweenRef.current.kill(); tweenRef.current = null }

      const totalWidth = track.scrollWidth
      const half = totalWidth / 2
      gsap.set(track, { x: 0 })
      const duration = Math.max(half / speed, 0.1)

      tweenRef.current = gsap.to(track, {
        x: -half,
        duration,
        ease: 'none',
        repeat: -1,
      })
    }, scope)

    const onResize = () => {
      ctx.revert()
      const ctx2 = gsap.context(() => {
        const track = trackRef.current
        if (!track) return
        if (tweenRef.current) { tweenRef.current.kill(); tweenRef.current = null }
        const totalWidth = track.scrollWidth
        const half = totalWidth / 2
        gsap.set(track, { x: 0 })
        const duration = Math.max(half / speed, 0.1)
        tweenRef.current = gsap.to(track, {
          x: -half,
          duration,
          ease: 'none',
          repeat: -1,
        })
      }, scope)
      return () => ctx2.revert()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      ctx.revert()
      if (tweenRef.current) { tweenRef.current.kill(); tweenRef.current = null }
    }
  }, [speed])

  const GalleryBody = (
    <div className="relative overflow-hidden rounded-xl border-2 border-stone-700">
      <div className="absolute top-2 left-2 text-xl torch-flicker select-none">🕯️</div>
      <div className="absolute bottom-2 right-2 text-xl torch-flicker select-none">🕯️</div>
      <div ref={trackRef} className="flex items-stretch gap-3 will-change-transform">
        {images.concat(images).map(({ src, alt }, i) => (
          <figure
            key={i}
            className="shrink-0 w-64 h-40 md:w-72 md:h-44 lg:w-80 lg:h-48 rounded-lg overflow-hidden border border-stone-700 bg-stone-900/60"
            title={alt}
          >
            <img
              src={src}
              alt={`Cuplikan CodeAlpha - ${alt}`}
              loading="lazy"
              className="w-full h-full object-cover select-none"
              draggable={false}
            />
          </figure>
        ))}
      </div>
    </div>
  )

  if (!framed) {
    return (
      <div ref={scope} className="w-full">
        {DungeonCSS}
        {GalleryBody}
      </div>
    )
  }

  return (
    <Card ref={scope} className="overflow-hidden border-4 border-amber-700 bg-gradient-to-b from-stone-900 to-stone-800">
      {DungeonCSS}
      <CardHeader>
        <CardTitle className="text-amber-300">Galeri Dungeon</CardTitle>
        <CardDescription className="text-stone-300">Geser tanpa henti</CardDescription>
      </CardHeader>
      <CardContent>{GalleryBody}</CardContent>
    </Card>
  )
}
