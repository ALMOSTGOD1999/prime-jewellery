import { Link, usePage } from '@inertiajs/react'
import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  Menu01Icon,
  Search01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Gold Jewellery', href: '/products?category=gold' },
  { name: 'Silver Jewellery', href: '/products?category=silver' },
  { name: 'About Us', href: '/about' },
  { name: 'Invest', href: '/investments' },
]

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { url, props } = usePage<any>()
  const user = props.user

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      {/* Main Header */}
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 hover:bg-muted rounded-md transition-colors shrink-0"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <HugeiconsIcon icon={Cancel01Icon} className="h-6 w-6" />
              ) : (
                <HugeiconsIcon icon={Menu01Icon} className="h-6 w-6" />
              )}
            </button>

            <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="size-10 md:size-12 rounded-full overflow-hidden bg-gradient-gold p-0.5 flex items-center justify-center">
                <img
                  src="https://cdn.imgchest.com/files/d7d2a3846fe3.jpeg"
                  alt="PRIME Jewellery"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 border-r border-border pr-6 xl:pr-8 mr-2 xl:mr-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium whitespace-nowrap transition-colors hover:text-gold ${
                    url === item.href ? 'text-gold' : 'text-muted-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            <button className="p-2 hover:bg-muted rounded-md transition-colors shrink-0">
              <HugeiconsIcon icon={Search01Icon} className="h-5 w-5" />
            </button>
            <Link
              href={user ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 bg-gradient-gold text-navy-dark px-4 py-2 rounded-xl text-sm font-medium hover:shadow-gold transition-all"
            >
              <HugeiconsIcon icon={UserIcon} className="h-4 w-4" />
              <span className="hidden sm:inline">{user ? 'Dashboard' : 'Login'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-background border-t border-border">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-base font-medium py-2 transition-colors hover:text-gold ${
                  url === item.href ? 'text-gold' : 'text-muted-foreground'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
