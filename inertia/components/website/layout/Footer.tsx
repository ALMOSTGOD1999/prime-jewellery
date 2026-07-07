import { Link } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Facebook02Icon,
  InstagramIcon,
  TwitterIcon,
  YoutubeIcon,
  Location01Icon,
  Call02Icon,
  Mail01Icon,
} from '@hugeicons/core-free-icons'

const Footer = () => {
  return (
    <footer className="bg-navy-dark text-white">
      {/* Main Footer */}
      <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="size-24 rounded-full overflow-hidden bg-gradient-gold p-0.5 flex items-center justify-center shadow-gold">
                <img
                  src="https://cdn.imgchest.com/files/d7d2a3846fe3.jpeg"
                  alt="PRIME Jewellery"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Crafting timeless elegance since 1985. Your trusted destination for exquisite gold and
              silver jewellery that celebrates life's most precious moments.
            </p>
            <div className="flex gap-3 pt-2">
              <a href="#" className="p-2.5 bg-white/10 rounded-lg hover:bg-gold transition-colors">
                <HugeiconsIcon icon={Facebook02Icon} className="h-4 w-4" />
              </a>
              <a href="#" className="p-2.5 bg-white/10 rounded-lg hover:bg-gold transition-colors">
                <HugeiconsIcon icon={InstagramIcon} className="h-4 w-4" />
              </a>
              <a href="#" className="p-2.5 bg-white/10 rounded-lg hover:bg-gold transition-colors">
                <HugeiconsIcon icon={TwitterIcon} className="h-4 w-4" />
              </a>
              <a href="#" className="p-2.5 bg-white/10 rounded-lg hover:bg-gold transition-colors">
                <HugeiconsIcon icon={YoutubeIcon} className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold text-gold">Quick Links</h4>
            <ul className="space-y-3">
              {[
                'Gold Jewellery',
                'Silver Jewellery',
                'New Arrivals',
                'Best Sellers',
                'Investment Plans',
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="/products"
                    className="text-white/60 hover:text-gold transition-colors text-sm"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold text-gold">Support</h4>
            <ul className="space-y-3">
              {['About Us', 'Contact Us', 'FAQs', 'Shipping & Returns', 'Privacy Policy'].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href="/about"
                      className="text-white/60 hover:text-gold transition-colors text-sm"
                    >
                      {item}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-semibold text-gold">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <HugeiconsIcon
                  icon={Location01Icon}
                  className="h-5 w-5 text-gold shrink-0 mt-0.5"
                />
                <span className="text-white/60 text-sm">Newtown, Kolkata - 700135</span>
              </li>
              <li className="flex items-center gap-3">
                <HugeiconsIcon icon={Call02Icon} className="h-5 w-5 text-gold shrink-0" />
                <span className="text-white/60 text-sm">+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-3">
                <HugeiconsIcon icon={Mail01Icon} className="h-5 w-5 text-gold shrink-0" />
                <span className="text-white/60 text-sm">info@primejewellers.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} PRIME Jewellery Private Limited. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-white/40">
            <span>BIS Hallmarked</span>
            <span>•</span>
            <span>100% Certified</span>
            <span>•</span>
            <span>Lifetime Exchange</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
