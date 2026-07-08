import { Link, usePage } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, DashboardSquare02Icon } from '@hugeicons/core-free-icons'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '~/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import { NavUser } from './nav-user'
import { ThemeToggle } from '~/components/theme-toggle'
import type { NavGroup, NavItem } from './types'
import { cn } from '~/lib/utils'

export function AppSidebar({ sidebarLinks }: { sidebarLinks: NavGroup[] }) {
  const { url } = usePage()

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={(props: any) => <Link href="/dashboard" {...props} />}
              className="gap-3 data-active:bg-transparent hover:bg-transparent"
            >
              <div className="size-8 shrink-0 rounded-full overflow-hidden bg-gradient-gold p-0.5 flex items-center justify-center">
                <img
                  src="https://cdn.imgchest.com/files/d7d2a3846fe3.jpeg"
                  alt="PRIME"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-sidebar-foreground text-base">
                  PRIME
                </span>
                <span className="truncate text-[10px] tracking-wider text-sidebar-primary font-medium">
                  Operational Portal
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {sidebarLinks.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/50">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavItemRenderer key={item.title} item={item} url={url} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-3">
        <ThemeToggle />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

function NavItemRenderer({ item, url }: { item: NavItem; url: string }) {
  // Collapsible group with sub-items
  if ('items' in item && item.items) {
    const isGroupActive = item.items.some(
      (subItem) =>
        url === subItem.url ||
        url.startsWith(subItem.url + '/') ||
        url.startsWith(subItem.url + '?')
    )

    return (
      <Collapsible defaultOpen={isGroupActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger
            render={(props: any) => (
              <SidebarMenuButton
                {...props}
                className={cn(
                  'gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isGroupActive
                    ? 'bg-sidebar-primary/10 text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                {item.icon && (
                  <span
                    className={cn(
                      isGroupActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50'
                    )}
                  >
                    <item.icon />
                  </span>
                )}
                <span className="flex-1">{item.title}</span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={2}
                  className="size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 text-sidebar-foreground/40"
                />
              </SidebarMenuButton>
            )}
          />
          <CollapsibleContent>
            <SidebarMenuSub className="mx-0 border-l-0 px-0">
              {item.items.map((subItem) => {
                const isActive =
                  url === subItem.url ||
                  url.startsWith(subItem.url + '/') ||
                  url.startsWith(subItem.url + '?')

                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      isActive={isActive}
                      render={(props: any) => <Link href={subItem.url} {...props} />}
                      className={cn(
                        'ml-2 rounded-lg px-3 py-1.5 text-sm font-medium border-l-[3px] transition-all duration-200',
                        isActive
                          ? 'border-l-sidebar-primary text-sidebar-primary bg-sidebar-primary/10'
                          : 'border-l-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:border-l-sidebar-accent'
                      )}
                    >
                      {subItem.icon ? (
                        <span
                          className={cn(
                            isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50'
                          )}
                        >
                          <subItem.icon />
                        </span>
                      ) : null}
                      <span>{subItem.title}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  // Regular link
  const isActive =
    url === item.url || url.startsWith(item.url + '/') || url.startsWith(item.url + '?')

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={(props: any) => <Link href={item.url!} {...props} />}
        className={cn(
          'gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-sidebar-primary/15 text-sidebar-primary font-semibold shadow-sm'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        {item.icon && (
          <span className={cn(isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50')}>
            <item.icon />
          </span>
        )}
        <span className="flex-1">{item.title}</span>
        {item.badge != null && (
          <SidebarMenuBadge className="bg-sidebar-primary/20 text-sidebar-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
            {item.badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
