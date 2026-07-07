import { Link } from '@inertiajs/react'
import goldCollection from '~/assets/website/gold-collection.jpg'
import silverCollection from '~/assets/website/silver-collection.jpg'

const categories = [
  {
    name: 'Gold Jewellery',
    description: 'Timeless elegance in 22K & 24K gold',
    image: goldCollection,
    href: '/products?category=gold',
    accent: 'from-sunset/20 to-transparent',
  },
  {
    name: 'Silver Jewellery',
    description: 'Contemporary designs in pure silver',
    image: silverCollection,
    href: '/products?category=silver',
    accent: 'from-sky/20 to-transparent',
  },
]

const CategorySection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="text-gold font-medium tracking-wider text-sm">OUR COLLECTIONS</span>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2">Shop by Category</h2>
          <div className="w-20 h-1 bg-gradient-gold mx-auto mt-4" />
        </div>

        {/* Category Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group relative overflow-hidden rounded-xl shadow-card hover:shadow-lg transition-all duration-500"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className={`absolute inset-0 bg-gradient-to-t ${category.accent}`} />
              <div className="absolute inset-0 bg-navy/40 group-hover:bg-navy/50 transition-colors" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <h3 className="text-2xl md:text-3xl font-heading font-bold mb-2 group-hover:scale-105 transition-transform">
                  {category.name}
                </h3>
                <p className="text-white/80 mb-4">{category.description}</p>
                <span className="inline-flex items-center gap-2 text-sunset-light font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore Now
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CategorySection
