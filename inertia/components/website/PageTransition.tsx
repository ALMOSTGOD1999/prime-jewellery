'use client'
import { useEffect, useRef, useState } from 'react'
import { router } from '@inertiajs/react'

export default function PageTransition() {
  const [show, setShow] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [phase, setPhase] = useState<'brand' | 'tagline' | 'done'>('brand')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const cleanup = router.on('start', () => {
      // Clear any pending timers from previous navigation
      timers.current.forEach(clearTimeout)
      timers.current = []

      setShow(true)
      setFadeOut(false)
      setPhase('brand')

      // Fast sequence: brand → tagline → fade out
      timers.current.push(setTimeout(() => setPhase('tagline'), 350))
      timers.current.push(
        setTimeout(() => {
          setPhase('done')
          setFadeOut(true)
        }, 700)
      )
      timers.current.push(setTimeout(() => setShow(false), 1000))
    })

    return cleanup
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-navy-dark via-navy to-sky-dark overflow-hidden transition-opacity duration-300 ease-in-out"
      style={{ opacity: fadeOut ? 0 : 1 }}
    >
      {/* Quick glow orbs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky/10 blur-3xl" />

      <div className="relative flex flex-col items-center justify-center">
        {/* Brand */}
        <div
          className="mb-3 text-center transition-all duration-300 ease-out"
          style={{
            opacity: 1,
            transform: 'translateY(0)',
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <div className="size-10 rounded-full bg-gradient-gold shadow-gold flex items-center justify-center">
              <span className="text-navy-dark text-lg font-bold font-heading">P</span>
            </div>
            <span className="text-3xl md:text-4xl font-heading font-bold text-gold no-underline">
              PRIME
            </span>
          </div>
        </div>

        {/* Tagline */}
        <div
          className="text-center transition-all duration-300 ease-out"
          style={{
            opacity: phase === 'brand' ? 0 : 1,
            transform: phase === 'brand' ? 'translateY(15px)' : 'translateY(0)',
          }}
        >
          {(phase === 'tagline' || phase === 'done') && (
            <p className="text-white text-2xl md:text-4xl font-bold tracking-wide">
              <span className="text-gold font-bold">"</span>
              Dreams Will Become True
              <span className="text-gold font-bold">"</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
