import AuthLayout from '~/components/auth/layout'
import { SignupForm } from '~/components/auth/signup-form'

export default function SignupPage({ ref, leg }: { ref?: string; leg?: string }) {
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="w-full rounded-xl border bg-background shadow-sm">
          <div className="flex flex-col items-center justify-center gap-6 rounded-t-xl border-b bg-card/60 py-12">
            <div className="rounded-full overflow-hidden bg-gradient-gold p-0.5 inline-flex shadow-gold">
              <img
                alt="Brand Logo"
                height={100}
                src="https://cdn.imgchest.com/files/d7d2a3846fe3.jpeg"
                width={100}
                className="rounded-full object-cover"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <h1 className="font-bold text-2xl tracking-wide">Create an Account!</h1>
              <p className="text-base text-muted-foreground">
                {leg === 'left'
                  ? 'You are joining the LEFT leg'
                  : leg === 'right'
                    ? 'You are joining the RIGHT leg'
                    : 'Enter your details'}
              </p>
            </div>
          </div>
          <SignupForm refCode={ref} leg={leg} />
        </div>
        <p className="mt-8 text-muted-foreground text-sm">
          By clicking continue, you agree to our{' '}
          <a className="underline underline-offset-4 hover:text-primary" href="/terms">
            Terms of Service
          </a>{' '}
          and{' '}
          <a className="underline underline-offset-4 hover:text-primary" href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </AuthLayout>
  )
}
