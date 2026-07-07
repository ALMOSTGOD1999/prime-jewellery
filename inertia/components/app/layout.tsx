import type * as React from 'react'
import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { AppSidebar } from '~/components/app/app-sidebar'
import SkipToMain from '~/components/app/skip-to-main'
import useFlash from '~/hooks/use-flash'
import { Toaster } from '~/components/ui/sonner'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import useUser from '~/hooks/use-user'
import { getAppNav } from '~/lib/nav'
import usePageProps from '~/hooks/use-pages-props'
import type { AdminSidebarStats } from '~/components/app/types'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const flash = useFlash<{ success?: string; error?: string }>()
  const user = useUser()!
  const { sidebarStats } = usePageProps<{ sidebarStats: AdminSidebarStats }>()

  const sidebarLinks = useMemo(() => getAppNav(user, sidebarStats), [user, sidebarStats])

  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success)
    }
    if (flash?.error) {
      toast.error(flash.error)
    }
  }, [flash])

  return (
    <>
      <Toaster position="top-center" richColors />
      <SkipToMain />
      <SidebarProvider>
        <AppSidebar sidebarLinks={sidebarLinks} />
        <SidebarInset className="flex flex-col bg-gradient-to-br from-navy-dark/5 via-background to-sky-dark/5">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}
