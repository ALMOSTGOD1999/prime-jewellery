import { Link } from '@inertiajs/react'
import Layout from '~/components/website/layout/Layout'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Target01Icon,
  ViewIcon,
  StarIcon,
  UserGroupIcon,
  Globe02Icon,
  Leaf01Icon,
} from '@hugeicons/core-free-icons'
import silverCollection from '~/assets/website/silver-collection.jpg'

const missionPoints = [
  {
    icon: StarIcon,
    title: 'Excellence in Every Piece',
    description:
      'To create jewellery that exceeds expectations in design, quality, and craftsmanship.',
  },
  {
    icon: UserGroupIcon,
    title: 'Customer Delight',
    description:
      'To provide an unparalleled shopping experience that builds lasting relationships.',
  },
  {
    icon: Globe02Icon,
    title: 'Preserve Heritage',
    description:
      'To keep traditional Indian jewellery-making techniques alive for future generations.',
  },
  {
    icon: Leaf01Icon,
    title: 'Sustainable Practices',
    description: 'To embrace ethical sourcing and environmentally responsible manufacturing.',
  },
]

const visionGoals = [
  'Become the most trusted jewellery brand in India by 2030',
  'Expand to 100 stores across the country',
  'Pioneer innovation in jewellery technology and design',
  'Create 10,000 employment opportunities in the sector',
  'Establish international presence in 5 countries',
  'Lead the industry in sustainable and ethical practices',
  'Lead the industry in sustainable and ethical practices',
]

const MissionVision = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 bg-cream-dark">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <span className="text-sunset font-medium tracking-wider text-sm">OUR PURPOSE</span>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mt-2 mb-6 text-navy-dark dark:text-white">
              Mission & Vision
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Guided by purpose, driven by passion – our mission and vision shape every decision we
              make and every piece we create.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-sunset/10 flex items-center justify-center">
                  <HugeiconsIcon icon={Target01Icon} className="h-8 w-8 text-sunset" />
                </div>
                <div>
                  <span className="text-sunset font-medium tracking-wider text-sm">
                    OUR MISSION
                  </span>
                  <h2 className="text-3xl font-heading font-bold">What Drives Us</h2>
                </div>
              </div>
              <p className="text-xl text-muted-foreground leading-relaxed">
                To craft exquisite jewellery that celebrates life's precious moments, combining
                timeless tradition with contemporary artistry while maintaining the highest
                standards of quality, authenticity, and customer trust.
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                {missionPoints.map((point) => (
                  <div key={point.title} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon icon={point.icon} className="h-5 w-5 text-sunset" />
                      <h3 className="font-semibold">{point.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground pl-8">{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-gold opacity-10 rounded-lg transform rotate-3" />
              <img
                src={silverCollection}
                alt="Our Mission"
                className="relative rounded-lg shadow-card"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-16 bg-gradient-luxury">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <svg
              className="w-12 h-12 text-sunset-light/50 mx-auto mb-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <blockquote className="text-2xl md:text-3xl font-heading text-white leading-relaxed mb-6">
              "Every piece of jewellery we create is a promise – a promise of quality, a promise of
              beauty, and a promise of memories that will last forever."
            </blockquote>
            <cite className="text-white/70">— Hari Singh Mehta, Founder</cite>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-sunset/10 flex items-center justify-center">
                <HugeiconsIcon icon={ViewIcon} className="h-8 w-8 text-sunset" />
              </div>
            </div>
            <span className="text-sunset font-medium tracking-wider text-sm">OUR VISION</span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2 mb-4">
              Where We're Headed
            </h2>
            <p className="text-xl text-muted-foreground">
              To be India's most beloved jewellery brand, known for exceptional craftsmanship,
              unwavering integrity, and creating pieces that become cherished family heirlooms.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {visionGoals.map((goal, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-6 bg-card rounded-lg shadow-card hover:shadow-lg transition-shadow"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center shrink-0">
                    <span className="text-white font-bold">{idx + 1}</span>
                  </div>
                  <p className="text-foreground font-medium">{goal}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-heading font-bold mb-4">Be Part of Our Journey</h2>
            <p className="text-muted-foreground mb-8">
              Join us in celebrating life's precious moments with jewellery that tells your story.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/products">
                <button className="bg-gradient-gold text-white px-8 py-3 rounded-xl font-medium shadow-gold hover:shadow-lg transition-all">
                  Explore Collection
                </button>
              </Link>
              <Link href="/about">
                <button className="border-2 border-sunset text-sunset px-8 py-3 rounded-xl font-medium hover:bg-sunset hover:text-white transition-all">
                  Learn More
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default MissionVision
