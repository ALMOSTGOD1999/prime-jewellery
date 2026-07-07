import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogTitle,
} from '~/components/ui/dialog'
import { cn } from '~/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  previewClassName?: string
}

export function Image({ className, previewClassName, alt, ...props }: ImageProps) {
  return (
    <Dialog>
      <DialogTrigger className="contents">
        <img
          className={cn('cursor-pointer transition-opacity hover:opacity-90', className)}
          alt={alt}
          {...props}
        />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'w-auto max-w-[95vw] sm:max-w-[95vw] h-auto max-h-[95vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center',
          previewClassName
        )}
      >
        <DialogTitle className="sr-only">{alt || 'Image Preview'}</DialogTitle>
        <div className="relative flex items-center justify-center">
          <DialogClose className="absolute -top-10 -right-4 sm:-right-10 rounded-full bg-background/80 p-2 text-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <img
            className="h-auto w-auto object-contain max-h-[85vh] max-w-[90vw] rounded-md"
            alt={alt}
            {...props}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
