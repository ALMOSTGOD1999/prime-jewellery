//
// The correct href type
//

type Href = string

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ComponentType<any>
}

//
// Normal nav link (link only, no nested items)
//
type NavLink = BaseNavItem & {
  url: Href
  badge?: number | string
  items?: never
}

//
// Collapsible nav section (has children)
//
type NavCollapsible = BaseNavItem & {
  items: Array<BaseNavItem & { url: Href; badge?: number | string }>
  url?: never
  badge?: never
}

//
// Union of collapsible or link
//
type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

type SidebarData = {
  navGroups: NavGroup[]
}

export type AdminSidebarStats = {
  activeUsers: number
  activationRequests: number
  kycRequests: number
  bankRequests: number
  purchaseRequests: number
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
