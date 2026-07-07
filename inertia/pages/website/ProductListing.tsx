import { useState } from 'react'
import { Link, usePage } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { FavouriteIcon, FilterHorizontalIcon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
import Layout from '~/components/website/layout/Layout'
import { Button } from '~/components/website/ui/button'
import productRing from '~/assets/website/product-ring.jpg'
import productNecklace from '~/assets/website/product-necklace.jpg'
import productEarrings from '~/assets/website/product-earrings.jpg'
import productBangles from '~/assets/website/product-bangles.jpg'
import productChain from '~/assets/website/product-chain.jpg'
import productAnklet from '~/assets/website/product-anklet.jpg'
import productMaangtikka from '~/assets/website/product-maangtikka.jpg'
import productPendant from '~/assets/website/product-pendant.jpg'
import productToerings from '~/assets/website/product-toerings.jpg'
import productNosering from '~/assets/website/product-nosering.jpg'
import modelBridal from '~/assets/website/model-bridal.jpg'
import modelElegant from '~/assets/website/model-elegant.jpg'

const allProducts = [
  {
    id: 1,
    name: 'Diamond Solitaire Ring',
    category: 'Rings',
    material: 'gold',
    price: 45999,
    originalPrice: 52999,
    image: productRing,
    isNew: true,
  },
  {
    id: 2,
    name: 'Elegant Gold Pendant',
    category: 'Necklaces',
    material: 'gold',
    price: 28999,
    image: productNecklace,
    isBestSeller: true,
  },
  {
    id: 3,
    name: 'Traditional Jhumka Earrings',
    category: 'Earrings',
    material: 'gold',
    price: 18999,
    originalPrice: 22999,
    image: productEarrings,
  },
  {
    id: 4,
    name: 'Bridal Bangle Set',
    category: 'Bangles',
    material: 'gold',
    price: 125999,
    image: productBangles,
    isNew: true,
  },
  {
    id: 5,
    name: 'Temple Gold Chain',
    category: 'Necklaces',
    material: 'gold',
    price: 78999,
    image: productChain,
    isBestSeller: true,
  },
  {
    id: 6,
    name: 'Silver Payal Anklet Set',
    category: 'Anklets',
    material: 'silver',
    price: 8999,
    originalPrice: 10999,
    image: productAnklet,
  },
  {
    id: 7,
    name: 'Bridal Maang Tikka',
    category: 'Headpieces',
    material: 'gold',
    price: 35999,
    image: productMaangtikka,
    isNew: true,
  },
  {
    id: 8,
    name: 'Ruby Gold Pendant',
    category: 'Necklaces',
    material: 'gold',
    price: 42999,
    image: productPendant,
    isBestSeller: true,
  },
  {
    id: 9,
    name: 'Silver Toe Rings Set',
    category: 'Rings',
    material: 'silver',
    price: 3999,
    image: productToerings,
  },
  {
    id: 10,
    name: 'Bridal Nath with Chain',
    category: 'Nose Rings',
    material: 'silver',
    price: 6999,
    originalPrice: 8999,
    image: productNosering,
    isNew: true,
  },
  {
    id: 11,
    name: 'Classic Gold Band',
    category: 'Rings',
    material: 'gold',
    price: 15999,
    image: productRing,
  },
  {
    id: 12,
    name: 'Silver Cuff Bracelet',
    category: 'Bangles',
    material: 'silver',
    price: 12999,
    originalPrice: 15999,
    image: productBangles,
  },
  {
    id: 13,
    name: 'Kundan Choker Set',
    category: 'Necklaces',
    material: 'gold',
    price: 89999,
    image: productChain,
    isNew: true,
  },
  {
    id: 14,
    name: 'Silver Oxidized Earrings',
    category: 'Earrings',
    material: 'silver',
    price: 4999,
    image: productEarrings,
    isBestSeller: true,
  },
  {
    id: 15,
    name: 'Gold Kada Bangle',
    category: 'Bangles',
    material: 'gold',
    price: 65999,
    image: productBangles,
  },
  {
    id: 16,
    name: 'Pearl Drop Pendant',
    category: 'Necklaces',
    material: 'gold',
    price: 32999,
    originalPrice: 38999,
    image: productPendant,
  },
]

const categories = [
  'All',
  'Rings',
  'Necklaces',
  'Earrings',
  'Bangles',
  'Anklets',
  'Headpieces',
  'Nose Rings',
]
const sortOptions = ['Featured', 'Price: Low to High', 'Price: High to Low', 'Newest']

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)
}

const ProductListing = () => {
  const { url } = usePage()
  const searchParams = new URLSearchParams(url.split('?')[1])
  const categoryFilter = searchParams.get('category') || 'all'
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('Featured')
  const [showFilters, setShowFilters] = useState(false)

  const filteredProducts = allProducts.filter((product) => {
    const matchesMaterial = categoryFilter === 'all' || categoryFilter === product.material
    const matchesCategory = selectedCategory === 'All' || selectedCategory === product.category
    return matchesMaterial && matchesCategory
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'Price: Low to High':
        return a.price - b.price
      case 'Price: High to Low':
        return b.price - a.price
      default:
        return 0
    }
  })

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
            >
              <HugeiconsIcon icon={FilterHorizontalIcon} className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <div className="hidden lg:flex items-center gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-background border border-border rounded-md px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sortOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="lg:hidden mb-6 p-4 bg-muted rounded-lg animate-fade-in">
            <h3 className="font-semibold mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {sortedProducts.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group bg-card rounded-lg overflow-hidden shadow-card hover:shadow-lg transition-all duration-300"
            >
              <div className="relative aspect-square overflow-hidden bg-cream">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {product.isNew && (
                    <span className="bg-sunset text-white text-xs font-medium px-2 py-1 rounded-md">
                      NEW
                    </span>
                  )}
                  {product.isBestSeller && (
                    <span className="bg-secondary text-secondary-foreground text-xs font-medium px-2 py-1 rounded">
                      BESTSELLER
                    </span>
                  )}
                  {product.originalPrice && (
                    <span className="bg-destructive text-destructive-foreground text-xs font-medium px-2 py-1 rounded">
                      SALE
                    </span>
                  )}
                </div>
                <button className="absolute top-3 right-3 p-2 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background">
                  <HugeiconsIcon icon={FavouriteIcon} className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {product.category}
                </span>
                <h3 className="font-medium mt-1 text-sm md:text-base line-clamp-1 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-semibold text-primary">{formatPrice(product.price)}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default ProductListing
