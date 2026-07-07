import { useForm } from '@inertiajs/react'
import type React from 'react'
import { useEffect } from 'react'

import PasswordInput from '~/components/ui/password-input'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { route } from '@izzyjs/route/client'
import useError from '~/hooks/use-error'

export function LoginForm({ className, ...props }: React.ComponentProps<'form'>) {
  const form = useForm({
    userId: '',
    password: '',
  })

  useEffect(() => {
    const message = sessionStorage.getItem('signupSuccess')
    if (message) {
      sessionStorage.removeItem('signupSuccess')
    }
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    form.post(route('auth.login').toString())
  }

  const errors = form.errors
  const authError = useError()?.auth as string

  return (
    <form className={cn('flex flex-col gap-6', className)} onSubmit={onSubmit} {...props}>
      {/* User ID Field */}
      <div className="space-y-2">
        <label htmlFor="userId" className="block text-sm font-medium text-white/80">
          User ID
        </label>
        <div className="relative">
          <Input
            aria-invalid={!!errors.userId}
            autoComplete="off"
            id="userId"
            placeholder="Enter your User ID or 'Admin'"
            value={form.data.userId}
            onChange={(e) => form.setData('userId', e.target.value)}
            className="h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-white placeholder:text-white/40 focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition-all"
          />
        </div>
        {errors.userId && <p className="text-red-400 text-xs mt-1">{errors.userId}</p>}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-white/80">
          Password
        </label>
        <div className="relative">
          <PasswordInput
            aria-invalid={!!errors.password}
            id="password"
            placeholder="Enter your password"
            value={form.data.password}
            onChange={(e) => form.setData('password', e.target.value)}
            className="h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-white placeholder:text-white/40 focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition-all"
          />
        </div>
        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
      </div>

      {/* Error Message */}
      {authError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-center">
          <p className="text-sm font-medium text-red-400">{authError}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={form.processing}
        className="relative h-12 w-full rounded-xl bg-gradient-gold text-navy-dark font-semibold text-base hover:shadow-gold hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {form.processing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  )
}
