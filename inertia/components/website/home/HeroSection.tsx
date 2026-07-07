import { Link } from '@inertiajs/react'
import { Button } from '~/components/website/ui/button'

const HeroSection = () => {
  return (
    <section className="relative min-h-[500px] lg:min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://cdn.imgchest.com/files/d9e28768bc87.jpg"
          alt="PRIME Jewellery - Exquisite Gold Jewellery Collection"
          className="w-full h-full object-cover object-top"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-dark/90 via-navy/70 to-navy/40" />
      </div>

      {/* Content */}
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8 relative z-10">
        <div className="max-w-2xl">
          {/* Gold Accent Brand Label */}
          <span className="inline-block text-gold-light font-medium tracking-[0.2em] text-sm md:text-base uppercase mb-4 animate-fade-in-up drop-shadow-lg">
            PRIME JEWELLERY PRIVATE LIMITED
          </span>

          {/* Main Heading with Gold Gradient Slogan */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6 animate-fade-in-up">
            Dreams Will Become <span className="text-gradient-gold drop-shadow-lg">True.</span>
          </h1>

          {/* Supporting Text */}
          <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed max-w-xl animate-fade-in-up drop-shadow-md">
            Discover our exquisite collection of handcrafted jewellery, where traditional artistry
            meets contemporary design. Each piece tells a story of elegance and precision.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 animate-fade-in-up">
            <Link href="/products">
              <Button variant="gold" size="lg">
                Explore Collection
              </Button>
            </Link>
            <Link href="/investments">
              <Button variant="outlineGold" size="lg">
                Start Investing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none" />
    </section>
  )
}

export default HeroSection
