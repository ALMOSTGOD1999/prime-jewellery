import usePageProps from '~/hooks/use-pages-props'

export default function useFlash<T>() {
  const props = usePageProps<{ flash: T }>()

  return props.flash
}
