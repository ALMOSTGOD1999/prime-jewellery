import { SharedProps } from '@adonisjs/inertia/types'
import usePageProps from '~/hooks/use-pages-props'

export default function useUser() {
  const page = usePageProps<SharedProps>()
  return page.user
}
