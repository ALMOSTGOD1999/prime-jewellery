import { Link, router } from '@inertiajs/react'
import { Logout01Icon, Settings01Icon, UserEdit01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { route } from '@izzyjs/route/client'
import useUser from '~/hooks/use-user'

export function NavUser() {
  const user = useUser()!

  const handleLogout = () => {
    router.post(route('auth.logout').toString())
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button variant="ghost" className="relative h-8 w-8 rounded-full" {...props}>
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg bg-sidebar-primary/20 text-sidebar-primary text-xs font-medium">
                {user.name
                  .split(' ')
                  .slice(0, 2)
                  .map((name) => name.charAt(0))
                  .join('')}
              </AvatarFallback>
            </Avatar>
          </Button>
        )}
      />
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {user.role === 'user' && (
            <DropdownMenuItem
              render={({ onProgress: _1, onError: _2, ...props }) => (
                <Link href={route('settings.profile.page')} {...props}>
                  <HugeiconsIcon icon={UserEdit01Icon} className="size-4 mr-2" />
                  Profile
                </Link>
              )}
            />
          )}
          {user.role === 'admin' && (
            <DropdownMenuItem
              render={({ onProgress: _1, onError: _2, ...props }) => (
                <Link href={route('admin.settings.page')} {...props}>
                  <HugeiconsIcon icon={Settings01Icon} className="size-4 mr-2" />
                  Settings
                </Link>
              )}
            />
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleLogout}>
            <HugeiconsIcon icon={Logout01Icon} className="size-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
