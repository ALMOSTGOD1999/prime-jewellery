import { Moon02Icon, Sun01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { AnimatePresence, motion } from 'motion/react'
import { type MouseEvent, useCallback } from 'react'

import { Button } from '~/components/ui/button'
import { useTheme } from '~/components/ui/theme-provider'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  const handleThemeToggle = useCallback(
    (e?: MouseEvent) => {
      const newMode = theme === 'dark' ? 'light' : 'dark'
      const root = document.documentElement

      if (!document.startViewTransition) {
        setTheme(newMode)
        return
      }

      // Set coordinates from the click event
      if (e) {
        root.style.setProperty('--x', `${e.clientX}px`)
        root.style.setProperty('--y', `${e.clientY}px`)
      }

      document.startViewTransition(() => {
        setTheme(newMode)
      })
    },
    [theme, setTheme]
  )

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <Button
      className="group/toggle size-8 rounded-full"
      onClick={handleThemeToggle}
      size="icon"
      variant="secondary"
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.8, opacity: 0 }}
            initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
            key="moon"
            transition={{ duration: 0.3 }}
          >
            <HugeiconsIcon icon={Moon02Icon} className="h-4 w-4 text-foreground" />
          </motion.div>
        ) : (
          <motion.div
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0.8, opacity: 0 }}
            initial={{ rotate: 90, scale: 0.8, opacity: 0 }}
            key="sun"
            transition={{ duration: 0.3 }}
          >
            <HugeiconsIcon icon={Sun01Icon} className="h-4 w-4 text-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
