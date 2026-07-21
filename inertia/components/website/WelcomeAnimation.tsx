'use client'
import { useEffect, useState } from 'react'

const coinPositions = [
  { x: -180, y: -80, delay: 0.15 },
  { x: 200, y: -120, delay: 0.5 },
  { x: -220, y: 40, delay: 0.85 },
  { x: 190, y: 100, delay: 1.2 },
  { x: -150, y: 150, delay: 1.55 },
  { x: 160, y: -60, delay: 1.9 },
  { x: -100, y: -160, delay: 2.25 },
  { x: 130, y: 180, delay: 2.6 },
]

export default function WelcomeAnimation() {
  const [show, setShow] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [phase, setPhase] = useState<'coins' | 'brand' | 'tagline' | 'done'>('coins')

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('brand'), 3500)
    const timer2 = setTimeout(() => setPhase('tagline'), 4500)
    const timer3 = setTimeout(() => {
      setPhase('done')
      setFadeOut(true)
    }, 5300)
    const timer4 = setTimeout(() => setShow(false), 6200)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-navy-dark via-navy to-sky-dark overflow-hidden transition-opacity duration-1000 ease-in-out"
      style={{ opacity: fadeOut ? 0 : 1 }}
    >
      {/* Animated background orbs */}
      <div
        className="absolute -top-32 -left-32 h-96 w-96 animate-pulse rounded-full bg-gold/10 blur-3xl"
        style={{ animationDuration: '4s' }}
      />
      <div
        className="absolute -bottom-32 -right-32 h-96 w-96 animate-pulse rounded-full bg-sky/10 blur-3xl"
        style={{ animationDuration: '5s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gold/5 blur-3xl animate-pulse"
        style={{ animationDuration: '3s' }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative flex flex-col items-center justify-center">
        {/* === Phase 1: Coins gathering === */}
        <div className="relative mb-8">
          {/* The Savings Box */}
          <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
            {/* Box body */}
            <div className="absolute inset-0 rounded-2xl border-2 border-gold/60 bg-gradient-to-br from-gold/20 via-gold/10 to-navy-dark/60 shadow-2xl shadow-gold/20 backdrop-blur-sm">
              {/* Box slot on top */}
              <div className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 rounded-t-md bg-gradient-to-r from-gold-dark to-gold shadow-lg" />
              {/* Lock */}
              <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold/50 bg-gold/20 flex items-center justify-center">
                <span className="text-gold text-xs font-bold">$</span>
              </div>
            </div>
            {/* Box glow */}
            <div
              className="absolute -inset-4 rounded-full bg-gold/5 blur-2xl animate-pulse"
              style={{ animationDuration: '2s' }}
            />

            {/* Coins gathering into the box */}
            {coinPositions.map((coin, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  animation:
                    phase === 'coins'
                      ? `coinGather${i} 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${coin.delay}s forwards`
                      : phase === 'brand' || phase === 'tagline' || phase === 'done'
                        ? `coinRest 0.5s ease-out forwards`
                        : 'none',
                  opacity: 0,
                }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-200 via-gold to-yellow-600 shadow-lg shadow-gold/40 border border-yellow-100/60">
                  <span className="text-[11px] font-bold text-yellow-900">₹</span>
                </div>
                {/* Coin shine */}
                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white/50 blur-[1px]" />
              </div>
            ))}

            {/* Sparkle particles around box */}
            {[...Array(8)].map((_, i) => (
              <div
                key={`sparkle-${i}`}
                className="absolute h-1.5 w-1.5 rounded-full bg-gold"
                style={{
                  top: `${15 + Math.random() * 70}%`,
                  left: `${15 + Math.random() * 70}%`,
                  animation: `sparkle 1.2s ease-out ${0.2 + i * 0.35}s infinite`,
                  opacity: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* === Phase 2: Brand name === */}
        <div
          className="mb-3 text-center transition-all duration-800 ease-out"
          style={{
            opacity: phase === 'coins' ? 0 : 1,
            transform: phase === 'coins' ? 'translateY(15px)' : 'translateY(0)',
          }}
        >
          {phase !== 'coins' && (
            <div className="flex items-center justify-center gap-3">
              <div className="size-10 rounded-full bg-gradient-gold shadow-gold flex items-center justify-center">
                <span className="text-navy-dark text-lg font-bold font-heading">P</span>
              </div>
              <span className="text-3xl md:text-4xl font-heading font-bold text-gold no-underline">
                PRIME
              </span>
            </div>
          )}
        </div>

        {/* === Phase 3: Tagline === */}
        <div
          className="text-center transition-all duration-800 ease-out"
          style={{
            opacity: phase === 'coins' || phase === 'brand' ? 0 : 1,
            transform:
              phase === 'coins' || phase === 'brand' ? 'translateY(15px)' : 'translateY(0)',
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

        {/* Loading bar at bottom - positioned at page bottom edge */}
        <div className="fixed bottom-4 left-1/2 h-1 w-48 -translate-x-1/2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold via-sky to-gold"
            style={{
              animation: 'loadingBar 5.3s ease-in-out forwards',
              width: '0%',
            }}
          />
        </div>

        <p className="fixed bottom-1 text-[10px] text-white/30 tracking-widest animate-pulse">
          LOADING
        </p>
      </div>

      <style>{`
        @keyframes loadingBar {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes sparkle {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
          100% { opacity: 0; transform: scale(0) rotate(360deg); }
        }

        ${coinPositions
          .map(
            (coin, i) => `
            @keyframes coinGather${i} {
              0% {
                opacity: 0;
                transform: translate(${coin.x}px, ${coin.y}px) scale(0.3) rotate(-200deg);
              }
              50% {
                opacity: 1;
              }
              70% {
                transform: translate(calc(${coin.x * -0.15}px), calc(${coin.y * -0.15}px)) scale(1.15) rotate(10deg);
              }
              100% {
                opacity: 1;
                transform: translate(0, 0) scale(1) rotate(0deg);
              }
            }

            @keyframes coinRest {
              0% {
                opacity: 1;
                transform: translate(0, 0) scale(1) rotate(0deg);
              }
              100% {
                opacity: 1;
                transform: translate(0, 0) scale(1) rotate(0deg);
              }
            }
          `
          )
          .join('')}
      `}</style>
    </div>
  )
}
