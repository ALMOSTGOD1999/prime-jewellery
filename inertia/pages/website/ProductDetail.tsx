import { useState } from 'react'
import { Link } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  FavouriteIcon,
  Share01Icon,
  DeliveryTruck01Icon,
  SecurityCheckIcon,
  RefreshIcon,
  MinusSignIcon,
  PlusSignIcon,
  ShoppingBag01Icon,
} from '@hugeicons/core-free-icons'
import Layout from '~/components/website/layout/Layout'
import { Button } from '~/components/website/ui/button'
import productRing from '~/assets/website/product-ring.jpg'
import productNecklace from '~/assets/website/product-necklace.jpg'
import productEarrings from '~/assets/website/product-earrings.jpg'
import productBangles from '~/assets/website/product-bangles.jpg'

const productData: Record<string, any> = {
  '1': {
    name: 'Diamond Solitaire Ring',
    category: 'Rings',
    material: '22K Gold',
    price: 45999,
    originalPrice: 52999,
    images: [productRing, productNecklace, productEarrings],
    description:
      'This stunning diamond solitaire ring features a brilliant cut diamond set in 22K gold. Perfect for engagements, anniversaries, or as a timeless gift that will be cherished forever.',
    features: [
      'BIS Hallmarked 22K Gold',
      'Certified Natural Diamond',
      'Weight: 4.5 grams',
      'Diamond Clarity: VS1',
      'Diamond Color: G',
    ],
    sizes: ['5', '6', '7', '8', '9', '10'],
  },
  '2': {
    name: 'Elegant Gold Pendant',
    category: 'Necklaces',
    material: '22K Gold',
    price: 28999,
    images: [productNecklace, productRing, productBangles],
    description:
      'An elegant pendant necklace crafted in 22K gold with intricate filigree work. This versatile piece transitions seamlessly from day to evening wear.',
    features: [
      'BIS Hallmarked 22K Gold',
      '18-inch chain included',
      'Weight: 6.2 grams',
      'Lobster clasp closure',
      ' गिफ्ट box included',
    ],
    sizes: [],
  },
  '3': {
    name: 'Traditional Earrings',
    category: 'Earrings',
    material: '22K Gold',
    price: 18999,
    originalPrice: 22999,
    images: [productEarrings, productNecklace, productRing],
    description:
      'Beautiful traditional earrings featuring classic Indian craftsmanship. These statement pieces are perfect for weddings, festivals, and special occasions.',
    features: [
      'BIS Hallmarked 22K Gold',
      'Push-back closure',
      'Weight: 8.5 grams',
      'Traditional design',
      'Nickel-free',
    ],
    sizes: [],
  },
  '4': {
    name: 'Bridal Bangle Set',
    category: 'Bangles',
    material: '22K Gold',
    price: 125999,
    images: [productBangles, productEarrings, productNecklace],
    description:
      'A magnificent set of 6 gold bangles designed for the modern bride. Each bangle features unique embossed patterns inspired by traditional Indian motifs.',
    features: [
      'BIS Hallmarked 22K Gold',
      'Set of 6 bangles',
      'Total Weight: 48 grams',
      'Handcrafted design',
      'Certificate of authenticity',
    ],
    sizes: ['2.4', '2.6', '2.8'],
  },
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)
}

const ProductDetail = ({ id }: { id?: string }) => {
  const product = productData[id || '1'] || productData['1']
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || '')
  const [quantity, setQuantity] = useState(1)

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-cream">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-4">
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === idx ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                {product.category} • {product.material}
              </span>
              <h1 className="text-3xl md:text-4xl font-heading font-bold mt-2">{product.name}</h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className="bg-destructive text-destructive-foreground text-sm font-medium px-2 py-1 rounded">
                    {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed">{product.description}</p>

            {/* Size Selection */}
            {product.sizes.length > 0 && (
              <div className="space-y-3">
                <label className="font-medium">
                  Select Size: <span className="text-primary">{selectedSize}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 rounded-md border-2 font-medium transition-colors ${
                        selectedSize === size
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-3">
              <label className="font-medium">Quantity</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-muted transition-colors"
                  >
                    <HugeiconsIcon icon={MinusSignIcon} className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-muted transition-colors"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button variant="gold" size="xl" className="flex-1">
                <HugeiconsIcon icon={ShoppingBag01Icon} className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" size="xl">
                <HugeiconsIcon icon={FavouriteIcon} className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="xl">
                <HugeiconsIcon icon={Share01Icon} className="h-5 w-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="space-y-4 pt-6 border-t border-border">
              <h3 className="font-heading font-semibold text-lg">Product Details</h3>
              <ul className="space-y-2">
                {product.features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 bg-sunset rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
              <div className="text-center">
                <HugeiconsIcon
                  icon={DeliveryTruck01Icon}
                  className="h-6 w-6 mx-auto text-sunset mb-2"
                />
                <span className="text-xs text-muted-foreground">Free Shipping</span>
              </div>
              <div className="text-center">
                <HugeiconsIcon
                  icon={SecurityCheckIcon}
                  className="h-6 w-6 mx-auto text-sunset mb-2"
                />
                <span className="text-xs text-muted-foreground">BIS Certified</span>
              </div>
              <div className="text-center">
                <HugeiconsIcon icon={RefreshIcon} className="h-6 w-6 mx-auto text-sunset mb-2" />
                <span className="text-xs text-muted-foreground">Easy Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ProductDetail
