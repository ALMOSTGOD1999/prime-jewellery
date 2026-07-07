import type React from 'react'

import { SidebarTrigger } from '~/components/ui/sidebar'
import { ThemeToggle } from '../theme-toggle'
import { NavUser } from './nav-user'

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export const Header = ({ className, fixed, children, ...props }: HeaderProps) => (
  <header
    className="flex h-16 shrink-0 items-center border-b border-border bg-background/80 backdrop-blur-sm px-4 gap-3 sticky top-0 z-40"
    {...props}
  >
    {/* Left: Sidebar Trigger */}
    <div className="flex items-center gap-2">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1.5" />
    </div>

    {/* Center: Page Title */}
    <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">{children}</div>

    {/* Right: Actions */}
    <div className="ml-auto flex items-center gap-2">
      <ThemeToggle />
      <NavUser />
    </div>
  </header>
)

Header.displayName = 'Header'
