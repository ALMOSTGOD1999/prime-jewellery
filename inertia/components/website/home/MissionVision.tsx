import { HugeiconsIcon } from '@hugeicons/react'
import { Target01Icon, ViewIcon } from '@hugeicons/core-free-icons'

const commitments = [
  'Honesty and transparency in every transaction',
  'Reliability and unwavering quality standards',
  'Customer satisfaction as our top priority',
  'Continuous innovation in design and service',
  'Adapting to modern jewellery trends with grace',
]

const MissionVision = () => {
  return (
    <section className="relative py-20 lg:py-28 overflow-hidden bg-background">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--color-gold)_0%,_transparent_70%)] opacity-[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--color-sky)_0%,_transparent_70%)] opacity-[0.03] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 lg:mb-18">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-sky mb-4">
            Our Purpose
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground mb-4">
            Mission{' '}
            <span className="text-gradient-gold">&</span>{' '}
            <span className="text-gradient-sky">Vision</span>
          </h2>
          <div className="mx-auto w-24 h-1 rounded-full bg-linear-to-r from-gold via-sky to-gold mb-6" />
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            Guided by purpose and driven by passion — our mission and vision shape every decision
            we make and every piece we create.
          </p>
        </div>

        {/* Split Layout — Mission | Vision */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
          {/* ─── Mission Card ─── */}
          <div className="group relative bg-card border border-border rounded-2xl shadow-premium overflow-hidden transition-all duration-300 hover:-translate-y-1">
            {/* Gold gradient accent bar */}
            <div className="h-1.5 w-full bg-gradient-gold" />

            <div className="p-8 md:p-10 lg:p-12">
              {/* Icon + Label */}
              <div className="flex items-center gap-4 mb-6">
                <div className="shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20">
                  <HugeiconsIcon
                    icon={Target01Icon}
                    className="h-7 w-7 text-gold"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold tracking-[0.2em] uppercase text-gold">
                    Our Mission
                  </span>
                  <h3 className="text-2xl md:text-3xl font-heading font-bold text-foreground mt-1">
                    What Drives Us
                  </h3>
                </div>
              </div>

              {/* Mission Statement */}
              <p className="text-base md:text-lg text-foreground leading-relaxed mb-8">
                To celebrate weddings, anniversaries, festivals, achievements, and personal
                milestones by offering jewellery that becomes a treasured part of every
                customer&rsquo;s life.
              </p>

              {/* Commitments */}
              <div className="space-y-3">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Our Commitments
                </span>
                <ul className="space-y-2.5">
                  {commitments.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-gradient-gold" />
                      <span className="text-sm md:text-base text-muted-foreground leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ─── Vision Card ─── */}
          <div className="group relative bg-card border border-border rounded-2xl shadow-premium overflow-hidden transition-all duration-300 hover:-translate-y-1">
            {/* Gold gradient accent bar */}
            <div className="h-1.5 w-full bg-gradient-gold" />

            <div className="p-8 md:p-10 lg:p-12">
              {/* Icon + Label */}
              <div className="flex items-center gap-4 mb-6">
                <div className="shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky/10 border border-sky/20">
                  <HugeiconsIcon
                    icon={ViewIcon}
                    className="h-7 w-7 text-sky"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold tracking-[0.2em] uppercase text-sky">
                    Our Vision
                  </span>
                  <h3 className="text-2xl md:text-3xl font-heading font-bold text-foreground mt-1">
                    Where We&rsquo;re Headed
                  </h3>
                </div>
              </div>

              {/* Vision Statement */}
              <p className="text-base md:text-lg text-foreground leading-relaxed mb-8">
                To become one of the most trusted jewellery brands by providing authentic
                jewellery, superior craftsmanship, and outstanding customer service.
              </p>

              {/* Legacy Goal */}
              <div className="bg-gradient-to-br from-sky/[0.04] to-gold/[0.04] border border-border rounded-xl p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-linear-to-br from-gold/20 to-sky/20">
                    <svg
                      className="w-5 h-5 text-gold"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v3m0 0a6 6 0 016 6v3m-6-9a6 6 0 00-6 6v3m0 0a6 6 0 00-6 6v3m12-3a6 6 0 016 6v3m-6-9a6 6 0 00-6 6v3"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-heading font-semibold text-foreground mb-1.5">
                      A Legacy for Generations
                    </h4>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      Build a legacy that lasts for generations by offering jewellery that becomes
                      part of family traditions and celebrations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MissionVision
