import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import { UserGenderEnum, UserRoleEnum } from '#enums/user'
import { IndianStatesEnum } from '#enums/settings'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  history: { encrypt: true },
  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    user: (ctx) =>
      ctx.inertia.always(() => {
        const user = ctx.auth?.user
        return user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              gender: user.gender,
              avatar: user.avatar?.url,
              role: user.role,
              activatedAt: user.activatedAt,
              address: user.address,
              zipcode: user.zipcode,
              city: user.city,
              state: user.state,
              createdAt: user.createdAt,
            }
          : undefined
      }),
    flash: (ctx) => ctx.inertia.always(() => ctx.session?.flashMessages?.all()),
    qs: (ctx) => ctx.inertia.always(() => ctx.request.qs()),
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/ssr.tsx',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {
    user?: {
      id: number
      name: string
      email: string
      phone: string
      gender: UserGenderEnum
      avatar?: string
      role: UserRoleEnum
      address: string
      zipcode: number
      city: string
      state: IndianStatesEnum
      activatedAt: string
      createdAt: string
    }
  }
}
