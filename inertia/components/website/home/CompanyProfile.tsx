import modelGold from '~/assets/website/model-gold.jpg'

const stats = [
  { label: 'Years of Excellence', value: '38+' },
  { label: 'Happy Customers', value: '50K+' },
  { label: 'Unique Designs', value: '10K+' },
]

const CompanyProfile = () => {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-50/50 via-white to-white dark:from-navy-dark/30 dark:via-background dark:to-background" />

      {/* Decorative corner accent */}
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-sky/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[1920px] mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-14 lg:mb-16 animate-fade-in-up">
          <span className="inline-block text-sunset font-medium tracking-[0.2em] text-sm uppercase">
            About Prime Jewellery
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mt-3 text-navy-dark dark:text-white">
            Dreams Will Become True
          </h2>
          <div className="w-24 h-1 bg-gradient-gold mx-auto mt-5 rounded-full" />
        </div>

        {/* 2-Column Grid: Text Left / Image Right */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column — Company Text */}
          <div className="space-y-6 animate-fade-in-up">
            <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
              At{' '}
              <strong className="text-foreground font-semibold">
                PRIME Jewellery Private Limited
              </strong>
              , we are dedicated to providing elegant, premium-quality jewellery crafted with
              exceptional workmanship. Each piece in our collection is thoughtfully designed to
              celebrate life's most precious moments — from engagements and weddings to
              anniversaries and everyday milestones.
            </p>
            <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
              Trust and authenticity are the cornerstones of everything we do. We take pride in
              offering 100% BIS Hallmarked jewellery with complete transparency, ensuring every
              purchase brings confidence and joy to our customers. Our commitment to customer
              satisfaction goes beyond the sale — we build long-term relationships rooted in
              integrity and mutual respect.
            </p>
            <p className="text-muted-foreground leading-relaxed text-base lg:text-lg">
              Our master artisans pour decades of expertise into every design, blending timeless
              aesthetics with contemporary elegance. From intricate handcrafted details to flawless
              finishes, we maintain the highest standards of quality and craftsmanship, creating
              heirloom-worthy pieces that transcend generations.
            </p>

            {/* Gold-accented highlight box */}
            <div className="relative pl-6 border-l-2 border-sunset/40 mt-8">
              <p className="italic text-foreground/90 font-heading text-lg">
                "Every jewellery piece is designed to celebrate life's most precious moments."
              </p>
            </div>
          </div>

          {/* Right Column — Image / Decorative */}
          <div className="relative animate-fade-in-up">
            <div className="relative rounded-2xl overflow-hidden shadow-premium">
              <img
                src={modelGold}
                alt="PRIME Jewellery — Premium Gold Collection"
                className="w-full h-auto object-cover"
              />
              {/* Overlay gradient at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/20 to-transparent pointer-events-none" />
            </div>

            {/* Decorative gold accent frame */}
            <div className="absolute -bottom-4 -right-4 w-full h-full rounded-2xl border-2 border-gold/20 -z-10 hidden lg:block" />
            <div className="absolute -top-4 -left-4 w-full h-full rounded-2xl border-2 border-sky/10 -z-10 hidden lg:block" />

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 lg:-left-6 bg-gradient-gold text-navy-dark font-heading font-bold px-5 py-3 rounded-xl shadow-gold hidden md:block">
              <span className="text-sm">Since 1985</span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="relative mt-16 lg:mt-20 grid grid-cols-3 gap-8 py-10 px-6 lg:px-12 rounded-2xl bg-gradient-luxury shadow-premium">
          {stats.map((stat, index) => (
            <div key={stat.label} className="relative text-center">
              <p className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-sunset-light">
                {stat.value}
              </p>
              <p className="text-white/70 text-sm md:text-base mt-1">{stat.label}</p>
              {/* Vertical divider (not after last item) */}
              {index < stats.length - 1 && (
                <div className="hidden md:block absolute right-0 top-1/4 bottom-1/4 w-px bg-white/10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CompanyProfile
