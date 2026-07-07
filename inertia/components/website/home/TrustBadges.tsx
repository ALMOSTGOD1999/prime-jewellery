import { HugeiconsIcon } from '@hugeicons/react'
import {
  SecurityCheckIcon,
  Award01Icon,
  DeliveryTruck01Icon,
  RefreshIcon,
  HeadphonesIcon,
  CreditCardIcon,
} from '@hugeicons/core-free-icons'

const features = [
  {
    icon: SecurityCheckIcon,
    title: 'BIS Hallmarked',
    description: '100% certified authentic jewellery',
  },
  {
    icon: Award01Icon,
    title: 'Premium Quality',
    description: 'Finest craftsmanship guaranteed',
  },
  {
    icon: DeliveryTruck01Icon,
    title: 'Free Shipping',
    description: 'On orders above ₹10,000',
  },
  {
    icon: RefreshIcon,
    title: 'Lifetime Exchange',
    description: 'Easy exchange policy',
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    description: 'Dedicated customer care',
  },
  {
    icon: CreditCardIcon,
    title: 'Secure Payments',
    description: 'Multiple payment options',
  },
]

const TrustBadges = () => {
  return (
    <section className="py-16 bg-background border-y border-border">
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted group-hover:bg-sunset/10 transition-colors mb-4">
                <HugeiconsIcon icon={feature.icon} className="h-7 w-7 text-sunset" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TrustBadges
