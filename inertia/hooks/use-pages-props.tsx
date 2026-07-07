import { usePage } from '@inertiajs/react'

export default function usePageProps<T = ReturnType<typeof usePage>['props']>() {
  const page = usePage()
  return page.props as T
}
