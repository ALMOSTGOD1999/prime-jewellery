import { router, useForm } from '@inertiajs/react'
import { route } from '@izzyjs/route/client'
import type React from 'react'

import PasswordInput from '~/components/ui/password-input'
import { Button } from '~/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import useSearchParams from '~/hooks/use-search-params'

export function SignupForm({
  className,
  refCode,
  leg,
  ...props
}: React.ComponentProps<'form'> & { refCode?: string; leg?: string }) {
  const qs = useSearchParams()

  // Determine the prefix based on leg
  const prefix = leg === 'right' ? 'PJR' : 'PJL'
  const initialRef = refCode ? `${prefix}${refCode}` : qs.ref ? `${prefix}${qs.ref}` : ''

  const form = useForm({
    referralCode: initialRef,
    leg: leg || qs.leg || '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  function updateUrlRef(ref: string) {
    if (ref) {
      router.get(
        route().current(),
        { ...qs, ref },
        { replace: true, preserveState: true, preserveScroll: true }
      )
    } else {
      router.get(
        route().current(),
        { ...qs },
        { replace: true, preserveState: true, preserveScroll: true }
      )
    }
  }

  async function signup() {
    form.post(route('auth.signup').toString(), {
      onSuccess: () => {
        // Handle success if needed
      },
      onError: (errors) => {
        console.error(errors)
      },
    })
  }
  const errors = form.errors

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      onSubmit={(e) => {
        e.preventDefault()
        signup()
      }}
      {...props}
    >
      <FieldGroup className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        {/* Referral Code */}
        <Field className="gap-2" data-invalid={errors.referralCode}>
          <FieldLabel>Invite Code*</FieldLabel>
          <Input
            type="text"
            value={form.data.referralCode || ''}
            onChange={(e) => {
              form.setData('referralCode', e.target.value)
              updateUrlRef(e.target.value)
            }}
            placeholder="PJL1234567 or PJR1234567"
            disabled={!!refCode}
            readOnly={!!refCode}
          />
          {errors.referralCode && <FieldError errors={[{ message: errors.referralCode }]} />}
        </Field>

        {/* Leg (hidden field, set from invite link) */}
        <input type="hidden" value={form.data.leg} name="leg" />

        {/* Name */}
        <Field className="gap-2" data-invalid={errors.name}>
          <FieldLabel>Your Name*</FieldLabel>
          <Input
            value={form.data.name}
            onChange={(e) => form.setData('name', e.target.value)}
            placeholder="John Doe"
          />
          {errors.name && <FieldError errors={[{ message: errors.name }]} />}
        </Field>

        {/* Email */}
        <Field className="gap-2" data-invalid={errors.email}>
          <FieldLabel>Your Email*</FieldLabel>
          <Input
            type="email"
            value={form.data.email}
            onChange={(e) => form.setData('email', e.target.value)}
            placeholder="example@gmail.com"
          />
          {errors.email && <FieldError errors={[{ message: errors.email }]} />}
        </Field>

        {/* Phone */}
        <Field className="gap-2" data-invalid={errors.phone}>
          <FieldLabel>Your Phone*</FieldLabel>
          <Input
            placeholder="9876543210"
            value={form.data.phone}
            onChange={(e) => form.setData('phone', e.target.value)}
          />
          {errors.phone && <FieldError errors={[{ message: errors.phone }]} />}
        </Field>

        {/* Password */}
        <Field className="gap-2" data-invalid={errors.password}>
          <FieldLabel>Password*</FieldLabel>
          <PasswordInput
            placeholder="******"
            value={form.data.password}
            onChange={(e) => form.setData('password', e.target.value)}
          />
          {errors.password && <FieldError errors={[{ message: errors.password }]} />}
        </Field>

        {/* Confirm Password */}
        <Field className="gap-2" data-invalid={errors.confirmPassword}>
          <FieldLabel>Confirm Password*</FieldLabel>
          <PasswordInput
            placeholder="******"
            value={form.data.confirmPassword}
            onChange={(e) => form.setData('confirmPassword', e.target.value)}
          />
          {errors.password && <FieldError errors={[{ message: errors.password }]} />}
        </Field>
      </FieldGroup>

      <div className="flex justify-center rounded-b-xl border-t bg-card/60 p-4">
        <Button className="w-full md:w-1/2" disabled={form.processing} type="submit">
          {form.processing ? 'Creating Account...' : 'Create Account'}
        </Button>
      </div>
    </form>
  )
}
