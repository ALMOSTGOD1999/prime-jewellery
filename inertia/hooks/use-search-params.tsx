import usePageProps from '~/hooks/use-pages-props'

export default function useSearchParams() {
  const props = usePageProps<{ qs: Record<string, any> }>()

  return props.qs
}
