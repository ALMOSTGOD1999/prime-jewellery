import AuthLayout from '~/components/auth/layout'
import { LoginForm } from '~/components/auth/login-form'

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="size-24 rounded-full overflow-hidden bg-gradient-gold p-1 flex items-center justify-center shadow-gold">
              <img
                src="https://cdn.imgchest.com/files/d7d2a3846fe3.jpeg"
                alt="PRIME Jewellery"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          </div>
          <h1 className="text-white text-2xl md:text-3xl font-heading font-bold">Welcome Back</h1>
          <p className="text-white/60 text-sm mt-2">Sign in to your account to continue</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-white/40 text-xs">
            By continuing, you agree to our{' '}
            <a className="text-gold/80 hover:text-gold underline underline-offset-2" href="/terms">
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              className="text-gold/80 hover:text-gold underline underline-offset-2"
              href="/privacy"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
