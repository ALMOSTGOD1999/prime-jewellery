import { Link } from '@inertiajs/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { route } from '@izzyjs/route/client'

import type { ReactNode } from 'react'

import { buttonVariants } from '~/components/ui/button'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-navy-dark via-navy to-sky-dark/80">
      {/* Decorative background orbs */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-sky/10 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-gold/5 blur-3xl" />

      {/* Animated grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-8">
        <Link
          href={route('home').toString()}
          className={buttonVariants({
            variant: 'ghost',
            className: 'absolute top-4 left-4 text-white/70 hover:text-white hover:bg-white/10',
          })}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          Home
        </Link>
        {children}
      </div>
    </div>
  )
}
