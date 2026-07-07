import { HugeiconsIcon } from '@hugeicons/react'
import {
  CheckmarkBadge01Icon,
  PaintBrush01Icon,
  Diamond01Icon,
  SparklesIcon,
  SecurityCheckIcon,
  Money01Icon,
  UserLove01Icon,
  GiftIcon,
  CrownIcon,
  GoldIcon,
} from '@hugeicons/core-free-icons'

const features = [
  {
    icon: CheckmarkBadge01Icon,
    title: 'Certified Purity and Authenticity',
    description:
      'Every piece of jewellery comes with BIS hallmark certification and a genuine purity guarantee, ensuring you invest with complete confidence.',
  },
  {
    icon: PaintBrush01Icon,
    title: 'Customized Jewellery Solutions',
    description:
      'Bring your vision to life with our bespoke design service — from concept sketches to finished masterpieces tailored to your style.',
  },
  {
    icon: Diamond01Icon,
    title: 'Exceptional Craftsmanship',
    description:
      'Our master artisans combine traditional techniques with modern precision to create heirloom-quality jewellery that lasts generations.',
  },
  {
    icon: SparklesIcon,
    title: 'Exclusive and Elegant Designs',
    description:
      'Discover curated collections that balance timeless elegance with contemporary flair — designs you will not find anywhere else.',
  },
  {
    icon: SecurityCheckIcon,
    title: 'Complete Trust and Transparency',
    description:
      'We believe in full transparency — from pricing and purity to sourcing and billing — so you always know exactly what you are investing in.',
  },
  {
    icon: Money01Icon,
    title: 'Best Value for Investment',
    description:
      'Competitive pricing, transparent rates, and the intrinsic value of gold make every purchase a smart financial decision.',
  },
  {
    icon: UserLove01Icon,
    title: 'Customer-First Service',
    description:
      'From personalised consultations to after-sales care, our dedicated team ensures a seamless and delightful experience at every step.',
  },
  {
    icon: GiftIcon,
    title: 'Jewellery for Every Occasion',
    description:
      'Whether it is a wedding, festival, milestone, or everyday elegance — find the perfect piece that celebrates your moment.',
  },
  {
    icon: CrownIcon,
    title: 'Legacy of Quality and Trust',
    description:
      'With decades of tradition and thousands of happy families, PRIME Jewellery stands for uncompromising quality and enduring trust.',
  },
]

const highlights = [
  {
    icon: GoldIcon,
    title: 'Gold as a Secure Investment',
    description:
      'Investing in gold today helps customers build a secure financial future. With rising global demand and enduring value, gold remains one of the safest assets for long-term wealth preservation.',
    gradient: 'from-gold/20 via-gold/5 to-transparent',
    borderColor: 'border-gold/20',
    glowColor: 'shadow-gold',
  },
  {
    icon: GiftIcon,
    title: 'Welcome Membership Gift',
    description:
      'Every new registered member receives a membership gift worth ₹1000 in the form of a branded Prime Jewellery bag — our way of welcoming you to the family.',
    gradient: 'from-sky/20 via-sky/5 to-transparent',
    borderColor: 'border-sky/20',
    glowColor: 'shadow-sky',
  },
]

const WhyChooseUs = () => {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden bg-background">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--color-gold)_0%,_transparent_70%)] opacity-[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--color-sky)_0%,_transparent_70%)] opacity-[0.03] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 lg:mb-20">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-sky mb-4">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-4">
            Crafted with <span className="text-gradient-gold">Passion</span>, Backed by{' '}
            <span className="text-gradient-sky">Trust</span>
          </h2>
          <div className="mx-auto w-24 h-1 rounded-full bg-linear-to-r from-gold via-sky to-gold mb-6" />
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Discover why thousands of customers trust PRIME Jewellery for their most precious
            moments — where quality meets integrity.
          </p>
        </div>

        {/* Features Grid — 9 cards, 3x3 layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 mb-12 lg:mb-16">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-card border border-border rounded-xl p-6 md:p-7 lg:p-8 transition-all duration-300 hover:border-gold/30 hover:shadow-gold hover:-translate-y-1"
            >
              {/* Hover accent bar */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-linear-to-r from-gold via-sky to-gold rounded-t-xl transition-all duration-300 group-hover:w-full" />

              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-linear-to-br from-gold/10 to-sky/10 border border-border group-hover:border-gold/20 mb-5 transition-colors duration-300">
                <HugeiconsIcon
                  icon={feature.icon}
                  className="h-6 w-6 md:h-7 md:w-7 text-gold group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Title */}
              <h3 className="text-base md:text-lg font-heading font-semibold text-foreground mb-2 group-hover:text-gold-dark transition-colors duration-300">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Wide Highlight Cards — Gold Investment + Membership Gift */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 lg:gap-8">
          {highlights.map((item) => (
            <div
              key={item.title}
              className={`relative bg-linear-to-br ${item.gradient} border ${item.borderColor} rounded-xl p-6 md:p-8 lg:p-10 ${item.glowColor} transition-all duration-300 hover:-translate-y-1`}
            >
              <div className="flex items-start gap-4 md:gap-5">
                {/* Icon */}
                <div className="shrink-0 inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-linear-to-br from-gold/20 to-sky/20 border border-border">
                  <HugeiconsIcon icon={item.icon} className="h-6 w-6 md:h-7 md:w-7 text-gold" />
                </div>

                {/* Content */}
                <div className="min-w-0">
                  <h3 className="text-lg md:text-xl font-heading font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhyChooseUs
