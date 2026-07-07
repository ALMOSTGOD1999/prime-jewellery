import { Link } from '@inertiajs/react'
import Layout from '~/components/website/layout/Layout'
import { HugeiconsIcon } from '@hugeicons/react'
import { Award01Icon, UserGroupIcon, FavouriteIcon, SparklesIcon } from '@hugeicons/core-free-icons'
import modelGold from '~/assets/website/model-gold.jpg'
import goldCollection from '~/assets/website/gold-collection.jpg'

const stats = [
  { label: 'Years of Excellence', value: '38+' },
  { label: 'Happy Customers', value: '50K+' },
  { label: 'Designs Created', value: '10K+' },
  { label: 'Stores Nationwide', value: '25+' },
]

const values = [
  {
    icon: Award01Icon,
    title: 'Quality Craftsmanship',
    description:
      'Every piece is crafted with precision by our master artisans who bring decades of expertise.',
  },
  {
    icon: UserGroupIcon,
    title: 'Customer First',
    description:
      'Your satisfaction is our priority. We go above and beyond to ensure a delightful experience.',
  },
  {
    icon: FavouriteIcon,
    title: 'Trust & Transparency',
    description: '100% BIS Hallmarked jewellery with complete transparency in pricing and quality.',
  },
  {
    icon: SparklesIcon,
    title: 'Innovation',
    description:
      'Blending traditional artistry with contemporary designs to create timeless pieces.',
  },
]

const AboutUs = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 bg-cream-dark">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <span className="text-sunset font-medium tracking-wider text-sm">OUR STORY</span>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mt-2 mb-6 text-navy-dark dark:text-white">
              Crafting Dreams Since 1985
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              For nearly four decades, PRIME Jewellers has been a trusted name in fine jewellery,
              creating pieces that celebrate life's most precious moments.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src={modelGold}
                alt="PRIME Jewellers Legacy"
                className="rounded-lg shadow-card"
              />
              <div className="absolute -bottom-6 -right-6 bg-gradient-gold p-6 rounded-lg shadow-gold hidden md:block">
                <p className="text-3xl font-heading font-bold text-white">38+</p>
                <p className="text-white/80 text-sm">Years of Excellence</p>
              </div>
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-heading font-bold">A Legacy of Trust & Excellence</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Founded in 1985 by Mr. Hari Singh Mehta, PRIME Jewellers began as a small
                  family-owned shop in the heart of Delhi. With a passion for creating beautiful
                  jewellery and a commitment to quality, the business quickly grew into one of the
                  most trusted names in the industry.
                </p>
                <p>
                  Today, under the leadership of the third generation, we continue to uphold the
                  same values that our grandfather instilled – craftsmanship, integrity, and
                  customer satisfaction. Every piece that leaves our workshop carries the weight of
                  our legacy and the promise of excellence.
                </p>
                <p>
                  Our team of master artisans, many of whom have been with us for over 20 years,
                  bring their expertise and passion to every design. We combine time-honored
                  techniques with modern innovation to create pieces that are both traditional and
                  contemporary.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-luxury">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl md:text-5xl font-heading font-bold text-sunset-light mb-2">
                  {stat.value}
                </p>
                <p className="text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-sunset font-medium tracking-wider text-sm">WHAT WE BELIEVE</span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2">Our Core Values</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="text-center p-6 rounded-xl bg-card shadow-card hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sunset/10 mb-4">
                  <HugeiconsIcon icon={value.icon} className="h-8 w-8 text-sunset" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workshop Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 order-2 lg:order-1">
              <span className="text-sunset font-medium tracking-wider text-sm">OUR WORKSHOP</span>
              <h2 className="text-3xl font-heading font-bold">Where Magic Happens</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Our state-of-the-art workshop houses the finest equipment and technology while
                  preserving traditional craftsmanship techniques passed down through generations.
                </p>
                <p>
                  Each piece undergoes rigorous quality checks at every stage – from design
                  conceptualization to final polishing. We use only the purest metals and ethically
                  sourced gemstones in our creations.
                </p>
              </div>
              <ul className="space-y-3">
                {[
                  '100% BIS Hallmarked',
                  'Certified Artisans',
                  'Quality Guaranteed',
                  'Ethical Sourcing',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-foreground">
                    <span className="w-2 h-2 bg-sunset rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <img
                src={goldCollection}
                alt="PRIME Jewellers Workshop"
                className="rounded-lg shadow-card"
              />
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default AboutUs
