/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/auth.ts" />
/// <reference path="../../config/inertia.ts" />

import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { createRoot } from 'react-dom/client'

import '../css/app.css'
import { ThemeProvider } from '~/components/ui/theme-provider'

const appName = import.meta.env.VITE_APP_NAME || 'PRIME Jewellery'

createInertiaApp({
  progress: { color: 'var(--primary)' },

  title: (title) => (title ? `${title} - ${appName}` : appName),

  resolve: (name) => {
    return resolvePageComponent(`../pages/${name}.tsx`, import.meta.glob('../pages/**/*.tsx'))
  },

  setup({ el, App, props }) {
    createRoot(el).render(
      <ThemeProvider defaultTheme="system" storageKey="theme">
        <App {...props} />
      </ThemeProvider>
    )
  },
}).then()
