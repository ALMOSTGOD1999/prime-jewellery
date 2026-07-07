import { Link } from '@inertiajs/react'
import modelBridal from '~/assets/website/model-bridal.jpg'
import modelElegant from '~/assets/website/model-elegant.jpg'

const CollectionBanners = () => {
  return (
    <section className="py-20 bg-background">
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8">
        {/* First Banner - Gold */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={modelBridal}
              alt="Gold Collection"
              className="w-full h-[500px] object-cover"
            />
          </div>
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <span className="text-sunset font-medium tracking-wider text-sm mb-4">
              WEDDING COLLECTION
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Bridal Gold
              <span className="text-gradient-gold block">Masterpieces</span>
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Celebrate your special day with our exquisite bridal collection. Each piece is
              meticulously crafted to complement the radiance of the bride, featuring intricate
              designs that blend traditional motifs with contemporary elegance.
            </p>
            <Link
              href="/products?category=gold&collection=bridal"
              className="inline-flex items-center gap-2 text-sunset font-medium hover:gap-4 transition-all w-fit"
            >
              Shop Bridal Collection
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Second Banner - Silver */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="flex flex-col justify-center p-8 lg:p-12 order-2 lg:order-1">
            <span className="text-sky font-medium tracking-wider text-sm mb-4">
              EVERYDAY ELEGANCE
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Contemporary
              <span className="block text-sky">Silver Designs</span>
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Discover our modern silver collection designed for everyday wear. Lightweight,
              stylish, and versatile pieces that effortlessly transition from office to evening
              gatherings.
            </p>
            <Link
              href="/products?category=silver"
              className="inline-flex items-center gap-2 text-sky font-medium hover:gap-4 transition-all w-fit"
            >
              Explore Silver Collection
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-xl order-1 lg:order-2">
            <img
              src={modelElegant}
              alt="Silver Collection"
              className="w-full h-[500px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default CollectionBanners
