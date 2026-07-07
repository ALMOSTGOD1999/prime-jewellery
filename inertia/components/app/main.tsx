import { Link } from '@inertiajs/react'
import { route } from '@izzyjs/route/client'

import type React from 'react'

import { cn } from '~/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import useUser from '~/hooks/use-user'
import { Button } from '~/components/ui/button'

import { UserRoleEnum } from '#enums/user'

interface MainProps extends React.HTMLAttributes<HTMLElement> {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export const Main = ({ fixed, className, children, ...props }: MainProps) => {
  const user = useUser()!

  return (
    <main
      className={cn(
        'flex-1 overflow-y-auto p-4 md:p-6',
        'scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent',
        className
      )}
      {...props}
    >
      {!user.activatedAt &&
        user.role === UserRoleEnum.USER &&
        !route().current('settings.activate.page') && (
          <Alert variant="destructive" className="mb-4 flex items-center justify-between rounded-lg bg-destructive/10 border-destructive/30">
            <div>
              <AlertTitle className="text-destructive font-semibold">Account Not Active</AlertTitle>
              <AlertDescription className="text-destructive/80">
                Please activate your account to access all features.
              </AlertDescription>
            </div>
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
              <Link href={route('settings.activate.page')}>Activate Now</Link>
            </Button>
          </Alert>
        )}
      {children}
    </main>
  )
}
Main.displayName = 'Main'
