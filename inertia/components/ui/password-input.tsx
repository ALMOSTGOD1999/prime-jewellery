import { HugeiconsIcon } from '@hugeicons/react'
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import type * as React from 'react'
import { useState } from 'react'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

export const title = 'Password with Toggle'

const PasswordInput = ({ className, type, ...props }: React.ComponentProps<'input'>) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <Input type={showPassword ? 'text' : 'password'} {...props} />
      <Button
        className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
        onClick={() => setShowPassword(!showPassword)}
        size="icon"
        type="button"
        variant="ghost"
      >
        {showPassword ? (
          <HugeiconsIcon icon={ViewOffIcon} className="h-4 w-4 text-muted-foreground" />
        ) : (
          <HugeiconsIcon icon={ViewIcon} className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  )
}

export default PasswordInput
