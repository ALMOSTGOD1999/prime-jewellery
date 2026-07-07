import { useState } from 'react'
import { Button } from '~/components/website/ui/button'

const Newsletter = () => {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle newsletter signup
    alert('Thank you for subscribing!')
    setEmail('')
  }

  return (
    <section className="py-20 bg-gradient-luxury">
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <span className="text-sunset-light font-medium tracking-wider text-sm">STAY CONNECTED</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mt-2 mb-4">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-white/70 mb-8">
            Be the first to know about new arrivals, exclusive offers, and special events.
          </p>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-gold-light transition-colors"
            />
            <Button variant="gold" size="lg" type="submit">
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Newsletter
